const viewTreeChart = {
    init: function() {
        this.svg = d3.select("#chart-display")
            .style("background-color", "white")
            .on("contextmenu", () => d3.event.preventDefault());
        this.drawLabels = true;
        this.menu = [
            {
                title: "View MS intensities",
                action: function(elm, d, i) {
                    let sampleIntensities = Object.values(d.data.samples);
                    if (!sampleIntensities) {
                        alert("No additional MS quantities for this dataset");  // change to modal
                        return;
                    }
                    viewMiniChart.render(d.data.taxon, sampleIntensities);
                }
            },
            {
                title: "Collapse all other nodes",
                action: function(elm, d, i) {
                    // Make selected node visible
                    if (elm.classList.contains("node-collapsed")) {
                        viewTreeChart.collapseNode(d, elm);
                    }
                    // Collapse all other nodes
                    let depth = d.depth;
                    let id = d.id;
                    let otherNodes = d3.selectAll(".node").filter(d => d.depth === depth && d.id !== id);

                    otherNodes.nodes().forEach(node => {
                        if (! node.classList.contains("node-collapsed")) {
                            viewTreeChart.collapseNode(node.__data__, node);
                        }
                    });
                    viewTreeChart.render(ctrlMain.getChartType());
                }
            }
        ];
    },
    project: function(x, y) {
        // calculate node and link position For radial tree
        const angle = (x - 90) / 180 * Math.PI, radius = y;
        return [radius * Math.cos(angle), radius * Math.sin(angle)];
    },
    render: function(type) {
        // Renders either simple or radial tree
        const { root, tree, color } = ctrlMain.getHierarchical(),
              { width, height } = ctrlMain.getDim();
        const tooltip = d3.select(".tooltip"),
              tooltipDuration = 200;
        const format = d3.format(".3");
        root.sort((a, b) => a.data.value - b.data.value);
            // .sort((a, b) => (a.height - b.height) || a.id.localeCompare(b.id)); // by alphabetical
            
        // Reset chart display and previous tooltips
        this.svg.selectAll("*").remove();
        tooltip.transition()
            .duration(tooltipDuration)
            .style("opacity", 0);

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
        
        const chart = this.svg.append("g")
            .attr("id", "chart");

        if (type === "radial-tree") {
            chart.attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");
        } else {
            chart.attr("transform", `translate(${ width * 0.08 }, ${ height * 0.05 })`);
            tree.size([height * 0.9, width * 0.8]);
        }

        tree(root);

        // Enter links
        const link = chart.selectAll(".link")
            .data(root.descendants().slice(1));
    
        const linkEnter = link.enter().append("path")
            .attr("class", "link")
        
        // Update and exit links
        link.merge(linkEnter)
            .attr("d", d => {
                if (type === "radial-tree") {
                    return "M" + this.project(d.x, d.y)  
                    + "C" + this.project(d.x, (d.y + d.parent.y) / 2)
                    + " " + this.project(d.parent.x, (d.y + d.parent.y) / 2)
                    + " " + this.project(d.parent.x, d.parent.y);
                }
                // Simple-tree:
                return "M" + d.y + "," + d.x                            // Move to coords (y,x), this is flipped to make the tree horizontal instead of vertical
                    + "C" + (d.y + d.parent.y) / 2 + "," + d.x
                    + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
                    + " " + d.parent.y + "," + d.parent.x;
            })
            .attr("stroke-opacity", 0.4)
    
        link.exit().remove();
        
        // Enter nodes
        const node = chart.selectAll("g.node")
            .data(root.descendants());

        const nodeEnter = node.enter().append("g")
            .classed("node", true)
            .on("mouseover", function(d) {
                tooltip.transition()
                    .duration(tooltipDuration)
                    .style("opacity", .9);
            })
            .on("mousemove", function(d) {
                let height = tooltip.node().clientHeight;
                let width = tooltip.node().clientWidth;
                tooltip.html(`Taxon: ${d.data.taxon}<br>Rank: ${d.data.rank}<br>Intensity: ${format(d.data.value)}`)
                    .style("left", (d3.event.pageX - width) + "px")
                    .style("top", (d3.event.pageY - height) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition()
                    .duration(tooltipDuration)
                    .style("opacity", 0);
            })
            .on("click", function(d) {
                viewTreeChart.collapseNode(d, this);  // pass in data and this elem                
                viewTreeChart.render(ctrlMain.getChartType());
            })
            .on("contextmenu", d3.contextMenu(this.menu));
    
        // Update nodes
        let nodeUpdate = node.merge(nodeEnter)
            .classed("node-collapsed", d => d._children)
        if (type === "radial-tree") {
            nodeUpdate.attr("transform", d => "translate(" + this.project(d.x, d.y) + ")")
        } else {
            nodeUpdate.attr("transform", d => "translate(" + d.y + "," + d.x + ")") // simple tree
        }

        const { taxonLevelColor, branchColor } = color;
        nodeUpdate.append("circle")
            .attr("r", d => Math.log10(d.data.value + 1) + 2)
            .style("fill", d => this.colorNode(d, taxonLevelColor, branchColor));
        
        const nodeLabel = nodeUpdate.append("text")
            .attr("class", "node-label")
            .style("font", "sans-serif")
            .style("font-size", "10px")
            .style("fill", "black")
            .style("display", this.drawLabels ? "block" : "none")
            .text(d => d.data.taxon);
        
        if (type === "radial-tree") {
            nodeLabel
                .attr("dy", ".31em")
                .attr("x", d => d.x < 180 === !d.children ? 6 : -6)
                .style("text-anchor", d => d.x < 180 === !d.children ? "start" : "end");
            if (nodeUpdate.size() < 100) {
                nodeLabel.attr("transform", d => "rotate(0)"); // no rotation if not too cluttered 
            }
            else {
                nodeLabel.attr("transform", d => "rotate(" + (d.x < 180 ? d.x - 90 : d.x + 90) + ")");
            }
        }
        else {
            nodeLabel
                .attr("dy", 4)
                .attr("x", d => d.depth === 0 ? -90 : 6)
                .style("text-anchor", "start");
        }
        // Exit Notes
        node.exit().remove();

        viewZoom.render(ctrlMain.getChartType());
        // Resets to last position instead of default position if user has zoomed, by translating by a tiny bit
        if (viewZoom.zoom) {
            viewZoom.zoom.translateBy(viewZoom.svg, 1e-9, 1e-9);
        }
    },
    collapseNode: function(d, nodeElem) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
            nodeElem.classList.add("node-collapsed");
        }
        else {
            d.children = d._children;
            d._children = null;
            nodeElem.classList.remove("node-collapsed");
        }
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
