const viewCirclePacking = {
    init: function() {
        this.svg = d3.select("#chart-display");
        this.margin = {top: 10, right: 10, bottom: 10, left: 10};
        this.drawLabels = true;
    },
    render: function() {
        this.svg.selectAll("*").remove();
        
        const { root, pack } = ctrlMain.getHierarchical(),
            { width, height } = ctrlMain.getDim();
        
        const margin = this.margin,
            chart = this.svg.append("g")
                .attr("class", "chart")
                .attr("transform", `translate(${width / 2}, ${height / 2})`);
        
        const format = d3.format(",d"),
          color = d3.scaleSequential([0,8], d3.interpolateBuPu);
        let focus = root;
            
        root.sum(d => d.value)
            .sort((a, b) => b.value - a.value);
        pack(root);
        console.log(root)

        this.svg.on("click", () => zoom(root));
        const node = chart.selectAll("circle")
            .data(root.descendants().slice(1))
            .join("circle")
                .attr("fill", d => color(d.height))
                .attr("pointer-events", d => !d.children ? "none" : null)
                .on("mouseover", function() { d3.select(this).attr("stroke", "#000"); })
                .on("mouseout", function() { d3.select(this).attr("stroke", null); })
                .on("click", d => focus !== d && (zoom(d), d3.event.stopPropagation()));

        const label = chart.append("g")
            .style("font", "10px sans-serif")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
        .selectAll("text")
        .data(root.descendants())
        .join("text")
            .style("fill-opacity", d => d.parent === root ? 1 : 0)
            .style("display", d => d.parent === root ? "inline" : "none")
            .text(d => d.id.substring(d.id.lastIndexOf("@") + 1));

        zoomTo([root.x, root.y, root.r * 2]);

        function zoomTo(v) {
            const k = width / v[2];

            view = v;

            label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
            node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
            node.attr("r", d => d.r * k);
        }

        function zoom(d) {
            const focus0 = focus;

            focus = d;

            const transition = chart.transition()
                .duration(d3.event.altKey ? 7500 : 750)
                .tween("zoom", d => {
                    const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
                    return t => zoomTo(i(t));
                });

            label
                .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
                .transition(transition)
                    .style("fill-opacity", d => d.parent === focus ? 1 : 0)
                    .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
                    .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
        }

    }
}