let viewTreeChart = {
    init: function() {
        const {width, height} = ctrlMain.getDim();

        this.svg = d3.select("#chart-display")
            .attr("width", width)
            .attr("height", height)
            .style("background-color", "white")
            .style("border", "1px solid black");

        this.ng = this.svg.append("g")
            .attr("transform", "translate(150,50)")
            .attr("id", "chart");
        
        this.drawLabels = true;
    },
    render: function() {
        this.ng.selectAll("*").remove(); // reset graph
        const {tree, root, color} = ctrlMain.getHierarchical();

        tree(root);

        // Enter links
        const link = this.ng.selectAll(".link")
            .data(root.descendants().slice(1));
    
        const linkEnter = link.enter().append("path")
            .attr("class", "link")
        
        // Update and exit links
        link.merge(linkEnter)
            .attr("d", d => {
                return "M" + d.y + "," + d.x                            // Move to coords (y,x), this is flipped to make the tree horizontal instead of vertical
                    + "C" + (d.y + d.parent.y) / 2 + "," + d.x          // Draw a cubic Bézier curve
                    + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
                    + " " + d.parent.y + "," + d.parent.x;
            })
            .attr("stroke-opacity", 0.4);
    
        link.exit().remove();
        
        // Enter nodes
        const node = this.ng.selectAll("g.node")
            .data(root.descendants());
        
        const tooltip = d3.select(".tooltip"),
            tooltipDuration = 500;
        
        const nodeEnter = node.enter().append("g")
            .classed("node", true)
            .on("mouseover", function(d) {
                tooltip.transition()
                    .duration(tooltipDuration)
                    .style("opacity", .9);
                if (viewTreeChart.drawLabels) {
                    tooltip.html("Value: " + d.data.value)
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                } else {
                    let names = d.data.id.split("@"),
                        name = names[names.length - 1];

                    tooltip.html(name + "<br>" + "Value: " + d.data.value)
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            })
            .on("mouseout", () => {
                tooltip.transition()
                    .duration(tooltipDuration)
                    .style("opacity", 0);
            })
            .on("click", function(d) {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                    this.classList.add("node-collapsed");
                } else {
                    d.children = d._children;
                    d._children = null;
                    this.classList.remove("node-collapsed");
                }
                tooltip.transition()
                    .duration(tooltipDuration)
                    .style("opacity", 0);
                
                viewTreeChart.render();
            });
    
        // Update nodes
        let nodeUpdate = node.merge(nodeEnter)
            .attr("transform", d => "translate(" + d.y + "," + d.x + ")")
            .classed("node-collapsed", d => d._children);
    
        const colorTaxonomicRank = d3.scaleOrdinal()
            .domain(d3.range(0, 10))
            .range(d3.schemeCategory10);
        
        const colorBranch = d3.scaleOrdinal()
            .range(d3.schemePaired);
    
        nodeUpdate.append("circle")
            .attr("r", d => Math.log10(d.data.value + 1) + 2)
            .style("fill", d => {
                const ranks = d.id.split("@");
                const count = ranks.length - 1;   // number of "@" in d.id
    
                if (count >= color.currentRank) {    // Specify rank for color to be based on (colors branches)
                    const rank = ranks[color.currentRank];
    
                    // Save color and last updated rank level for consistency
                    d._color =  colorBranch(rank);
                    d._currentRank = count;
                    return colorBranch(rank);
                }
                return colorTaxonomicRank(count);
            });
        
        nodeUpdate.append("text")
            .attr("class", "nodeLabel")
            .attr("dy", 4)
            .attr("x", d => d.depth === 0 ? -105 : 6)
            .style("text-anchor", "start")
            .style("font", "sans-serif")
            .style("font-size", 10)
            .style("fill", "black")
            .style("display", this.drawLabels ? "block" : "none")
            .text(d => d.id.substring(d.id.lastIndexOf("@") + 1));
        
        // Exit Notes
        node.exit().remove();
    }
}
