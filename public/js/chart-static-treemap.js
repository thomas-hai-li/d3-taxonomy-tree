const viewStaticTreemapChart = {
    init: function() {
        this.svg = d3.select("#chart-display");
        this.margin = {top: 10, right: 10, bottom: 10, left: 10};
        this.drawLabels = true;
        this.drawDepth = 0;
        this.menu = [
            {
                title: "View MS intensities",
                action: function(elm, d, i) {
                    let sampleIntensities = Object.values(d.data.samples);
                    if (!sampleIntensities) {
                        alert("No additional MS quantities for this dataset");  // change to modal
                        return;
                    }
                    const ids = d.id.split("@"),
                        name = ids[ids.length - 1];
                    viewMiniChart.render(name, sampleIntensities);
                }
            },
            {
                title: "Set as root",
                action: function(elm, d, i) {

                }
            }
        ];
    },
    render: function() {
        this.svg.selectAll("*").remove();
        
        const { root, treemap, /* color */ } = ctrlMain.getHierarchical(),
            margin = this.margin,
            drawDepth = this.drawDepth,
            chart = this.svg.append("g")
                .attr("class", "chart")
                .attr("transform", `translate(${margin.left}, ${margin.top})`),
            format = d3.format(",d"),
            color = d3.scaleOrdinal()   // based on superkingdom
                .domain(["Bacteria","Archaea","Eukaryota"])
                .range(d3.schemeSet3);

        root.sum(d => d.children ? 0 : 1)
            .each(d => --d.value)
            .sort((a, b) => b.value - a.value);
        treemap(root);

        const data = root.descendants(),
            maxValue = d3.max(data, d => +d.data.value),
            opacity = d3.scaleLinear()
                .domain([0,maxValue])
                .range([0, 0.5]);
        console.log(data);
        console.log("TCL: maxValue", maxValue);

        const node = chart.selectAll("g")
            .data(data)
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        node.append("title")
            .text(d => `${d.ancestors().reverse().map(d => d.id.substring(d.id.lastIndexOf("@") + 1)).join("/")}\nSubtaxa Identified: ${format(d.value)}\nAverage MS Intensity: ${d.data.avgIntensity}`);

        node.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d =>  d.y1 - d.y0)
            .style("stroke", "black")
            .style("fill", d => {while(d.depth > 1) { d = d.parent }; return color(d.id)})
            .style("opacity", d => opacity(+d.data.value))
            .on("contextmenu", d3.contextMenu(this.menu));

        node.append("clipPath")
                .attr("id", d => "clip-" + d.data.id)
            .append("use")
                .attr("xlink:href", d => "#" + d.data.id);

        node.append("text")
                .attr("clip-path", d => "url(#clip-" + d.data.id + ")")
                .attr("class", "nodeLabel")
                .style("display", d => this.drawLabels && d.depth === 0 ? "block" : "none")
            .selectAll("tspan")
                .data(d => d.id.substring(d.id.lastIndexOf("@") + 1).split().concat((d.value)))
            .join("tspan")
                .attr("x", 3)
                .attr("y", (d, i, node) => `${(i === node.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
                .attr("fill-opacity", (d, i, node) => i === node.length - 1 ? 0.7 : null)
                .text(d => d);
    },
    colorNode: function(d, taxonLevelColor, branchColor) {
        const {color} = ctrlMain.getHierarchical();
        const ranks = d.id.split("@");
        const count = ranks.length - 1;   // number of "@" in d.id

        if (count >= color.currentRank) {    // Specify rank for color to be based on (colors branches)
            const rank = ranks[color.currentRank];

            // Save color and last updated rank level for consistency
            d._color = branchColor(rank);
            d._currentRank = count;
            return branchColor(rank);
        }
        return taxonLevelColor(count);
    }
}
