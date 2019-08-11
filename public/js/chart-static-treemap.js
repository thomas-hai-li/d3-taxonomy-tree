const viewStaticTreemapChart = {
    init: function() {
        this.svg = d3.select("#chart-display");
        this.margin = {top: 30, right: 10, bottom: 10, left: 5};
        this.drawLabels = true;
        this.drawDepth = 1;
        this.menu = [
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
            }
        ];
    },
    render: function() {
        this.svg.selectAll("*").remove();

        // Setup:
        const { root, treemap, taxonRanks  } = ctrlMain.getHierarchical(),
            margin = this.margin,
            drawDepth = this.drawDepth,
            drawDepthRank = taxonRanks[drawDepth],
            chart = this.svg.append("g")
                .attr("class", "chart")
                .attr("transform", `translate(${margin.left}, ${margin.top})`),
            format = d3.format(".4g");

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

        // discards unknown peptide intensities (works but mutilates data)
        root.sum(d => {
                d.value = (d.rank === "Species" ? d.value : 0);
                return d.value;
            })
            .sort((a, b) => b.value - a.value);
        treemap(root);

        const data = root.descendants().filter(d => d.data.rank === drawDepthRank),
            maxValue = d3.max(data, d => +d.data.value),
            opacity = d3.scaleLinear()
                .domain([0,maxValue])
                .range([0, 0.5]);

        const node = chart.selectAll("g")
            .data(data)
            .join("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        node.append("title")
            .text(d => `${d.id.replace(/@/g,"/")}\nAverage MS Intensity: ${format(d.data.avgIntensity)}`);

        node.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d =>  d.y1 - d.y0)
            .style("stroke", "black")
            .style("fill", d => viewStaticTreemapChart.colorNode(d))
            // .style("opacity", d => opacity(+d.data.value))
            .on("contextmenu", d3.contextMenu(this.menu));

        node.append("clipPath")
                .attr("id", d => "clip-" + d.data.id)
            .append("use")
                .attr("xlink:href", d => "#" + d.data.id);

        node.append("text")
                .attr("clip-path", d => "url(#clip-" + d.data.id + ")")
                .attr("class", "node-label")
                .style("display", d => this.drawLabels ? "block" : "none")
            .selectAll("tspan")
                .data(d => d.data.taxon.split().concat((format(d.value))))
            .join("tspan")
                .attr("x", 3)
                .attr("y", (d, i, node) => `${(i === node.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
                .attr("fill-opacity", (d, i, node) => i === node.length - 1 ? 0.7 : null)
                .text(d => d);
    },
    colorNode: function(d) {
        const { taxonRanks, color: { currentRank, branchColor } } = ctrlMain.getHierarchical();
        const rankToNum = invert(taxonRanks); // key = taxon level, value = number (ascending)
        function invert (obj) {         // invert key-value pairs
            var inverted = {};
            for (var key in obj) {
                inverted[obj[key]] = +key;
            }
            return inverted;
        }
        
        let thisRank = d.data.rank;
        let p = d;
        while(rankToNum[thisRank] > rankToNum[currentRank]) {
            p = p.parent;
            thisRank = p.data.rank;
        }
        return branchColor(p.data.taxon);
    }
}
