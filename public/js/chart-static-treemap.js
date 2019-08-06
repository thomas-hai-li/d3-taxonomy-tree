const viewStaticTreemapChart = {
    init: function() {
        this.svg = d3.select("#chart-display");
        this.margin = {top: 30, right: 10, bottom: 10, left: 5};
        this.drawLabels = true;
        this.drawDepth = 0;
        this.menu = [
            {
                title: "MS Intensity",
                children: [
                    {
                        title: "Compare Sample Intensities",
                        action: d => {
                            if (!d.data.samples) {
                                alert("No additional MS quantities for this dataset");  // change to modal
                                return;
                            }
                            const name = d.data.taxon;
                            viewMiniChart.renderSamples(name, Object.entries(d.data.samples));
                        }
                    },
                    {
                        title: "Compare Subtaxa Intensities",
                        action: d => {
                            if (!d.children) {
                                alert("No subtaxa to compare");
                                return;
                            }
                            const sample = ctrlMain.getCurrentSample();
                            viewMiniChart.renderSubtaxa(sample, d);
                        }
                    },
                ]
            },
        ];
    },
    render: function() {
        this.svg.selectAll("*").remove();

        // Setup:
        const { root, treemap, /* color */ } = ctrlMain.getHierarchical(),
            margin = this.margin,
            drawDepth = this.drawDepth,
            chart = this.svg.append("g")
                .attr("class", "chart")
                .attr("transform", `translate(${margin.left}, ${margin.top})`),
            format = d3.format(".4g"),
            color = d3.scaleOrdinal()   // based on superkingdom
                .domain(["Bacteria","Archaea","Eukaryota"])
                .range(d3.schemeSet3);

        // Display name of sample viewed
        let sample = ctrlMain.getCurrentSample();
        this.svg.append("text")
            .attr("class", "current-sample")
            .attr("y", 20)
            .attr("x", 5)
            .style("font", "sans-serif")
            .style("font-size", "20px")
            .style("fill", "black")
            .style("opacity", 0.5)
            .text("Sample: " + (sample || "Averaged Values"));

        // Generate layout
        root.sum(d => d.children ? 0 : 1)
            .each(d => --d.value)
            .sort((a, b) => b.value - a.value);
        treemap(root);

        const data = root.descendants(),
            maxValue = d3.max(data, d => +d.data.value),
            opacity = d3.scaleLinear()
                .domain([0,maxValue])
                .range([0, 0.5]);

        const node = chart.selectAll("g")
            .data(data)
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        node.append("title")
            .text(d => `${d.id.replace(/@/g,"/")}\nSubtaxa Identified: ${d.value}\nAverage MS Intensity: ${format(d.data.avgIntensity)}`);

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
                .attr("class", "node-label")
                .style("display", d => this.drawLabels && d.depth === 0 ? "block" : "none")
            .selectAll("tspan")
                .data(d => d.data.taxon.split().concat((d.value)))
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
