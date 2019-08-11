const viewStaticTreemapChart = {
    init: function() {
        this.svg = d3.select("#chart-display");
        this.svg.selectAll("*").remove();

        this.margin = {top: 55, right: 10, bottom: 10, left: 5};
        this.drawLabels = true;
        this.labelSize = 16;
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
        // Display current rank/depth
        this.currentDepth = this.svg.append("text")
            .attr("class", "current-depth")
            .attr("y", 45)
            .attr("x", 5)
            .style("font", "sans-serif")
            .style("font-size", "20px")
            .style("fill", "black")
            .style("opacity", 0.75);
        
        this.chart = this.svg.append("g")
            .attr("class", "chart")
            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

        // Generate layout and data (discards unknown peptide intensities)
        const { root, treemap } = ctrlMain.getHierarchical();
        root.sum(d => {
            d.value = (d.rank === "Species" ? d.value : 0);
            return d.value;
        })
        .sort((a, b) => b.value - a.value);
        treemap(root);

        // Zoom utility
        const zoomed = () => {
            this.chart.attr("transform", d3.event.transform)
        }
        const zoom = d3.zoom().on("zoom", zoomed);
        this.svg.call(zoom);

        const { width } = ctrlMain.getDim();
        const resetZoom = this.svg.append("g")
            .attr("transform", `translate(${ width - 84 - this.margin.right }, 3)`)
        resetZoom.append("rect")
            .attr("width", 84)
            .attr("height", 20)
            .attr("stroke", "black")
            .attr("fill", "lightsteelblue")
            .on("mouseover", function() { d3.select(this).transition().attr("opacity", 0.5) })
            .on("mouseout", function() { d3.select(this).transition().attr("opacity", 1) })
            .on("click", () => {
                this.svg.transition()
                    .duration(750)
                    .call(zoom.transform, d3.zoomIdentity.translate(this.margin.left, this.margin.top));
            });
        resetZoom.append("text")
            .attr("text-anchor", "start")
            .attr("y", 15)
            .attr("pointer-events", "none")
            .text("Reset Zoom")
    },
    render: function() {
        // Setup:
        const { root, taxonRanks  } = ctrlMain.getHierarchical(),
            drawDepth = this.drawDepth,
            drawDepthRank = taxonRanks[drawDepth],
            format = d3.format(".4g"),
            t = d3.transition().duration(500);

        this.currentDepth.text("Depth: " + drawDepthRank);

        const data = root.descendants().filter(d => d.data.rank === drawDepthRank);

        const node = this.chart.selectAll(".node")
            .data(data, d => d.id);

        // exit
        node.exit()
            .transition(t)
                .style("opacity", 0)
                .remove();

        // enter (with this treemap implementation, there is no nodeUpdate because depths dont have common nodes)
        const nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x0},${d.y0})`)
            .style("opacity", 0);

        nodeEnter.append("title")
            .text(d => `${d.id.replace(/@/g,"/")}\nAverage MS Intensity: ${format(d.data.avgIntensity)}`);

        nodeEnter.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d =>  d.y1 - d.y0)
            .style("stroke", "black")
            .style("fill", d => viewStaticTreemapChart.colorNode(d))
            .on("contextmenu", d3.contextMenu(this.menu));

        nodeEnter.append("clipPath")
                .attr("id", d => "clip-" + d.data.id)
            .append("use")
                .attr("xlink:href", d => "#" + d.data.id);

        nodeEnter.append("text")
                .attr("clip-path", d => "url(#clip-" + d.data.id + ")")
                .attr("class", "node-label")
                .style("display", this.drawLabels ? "block" : "none")
                .style("font-size", this.labelSize + "px")
            .selectAll("tspan")
                .data(d => d.data.taxon.split().concat((format(d.value))))
            .join("tspan")
                .attr("x", 3)
                .attr("y", (d, i, node) => `${(i === node.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
                .attr("fill-opacity", (d, i, node) => i === node.length - 1 ? 0.7 : null)
                .text(d => d);
        
        nodeEnter.transition(t)
            .style("opacity", 1);
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
