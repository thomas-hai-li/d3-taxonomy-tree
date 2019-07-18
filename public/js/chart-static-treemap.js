viewStaticTreemapChart = {
    init: function() {
        this.svg = d3.select("#chart-display");
        this.margin = {top: 10, right: 10, bottom: 10, left: 10}
        this.drawDepth = 0;
    },
    render: function() {
        this.svg.selectAll("*").remove();
        
        const { root, treemap, /**color: { branchColor }*/ } = ctrlMain.getHierarchical(),
            margin = this.margin,
            drawDepth = this.drawDepth,
            chart = this.svg.append("g")
                .attr("class", "chart")
                .attr("transform", `translate(${margin.left}, ${margin.top})`),
            format = d3.format(",d"),
            color = d3.scaleOrdinal()   // based on superkingdom
                .domain(["Bacteria","Archaea","Eukaryota"])
                .range(d3.schemeSet1),
            opacity = d3.scaleLinear()
                .domain([0,11000])
                .range([0.25, 1]);

        root.sum(function(d) { return d.value; })
            // .each((node) => {
            //     node.value = Number(node.data.value);
            //     const siblings = root.descendants().filter((e) => e.depth === node.depth);
            //     const sum = siblings.map(node => node.value).reduce((sum, num) => sum + num);
            //     const proportion = node.value / sum;
            //     console.log(proportion);
            //     node.value = proportion;
            // })
            .sort((a, b) => b.value - a.value);
        treemap(root);

        const nodes = chart.selectAll("g")
            .data(root.descendants().filter((e) => e.depth === drawDepth))
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        nodes.append("title")
            .text(d => `${d.ancestors().reverse().map(d => d.id.substring(d.id.lastIndexOf("@") + 1)).join("/")}\n${format(d.value)}`);

        // nodes.append("clipPath")
        //     .attr("id", d => (d.clipUid = DOM.uid("clip")).id)
        //     .append("use")
        //     .attr("xlink:href", d => d.leafUid.href);

        nodes.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d =>  d.y1 - d.y0)
            .style("stroke", "black")
            .style("fill", d => { while (d.depth > 1) d = d.parent; return color(d.id); })
            .style("opacity", d => opacity(d.value));

        nodes.append("text")
            .selectAll("tspan")
            .data(d => d.id.substring(d.id.lastIndexOf("@") + 1).split().concat(format(d.value)))
            .join("tspan")
            .attr("x", 3)
            .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
            .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
            .text(d => d);
    }
}
