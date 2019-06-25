let viewTreeChart = {
    init: function() {
        this.svg = d3.select("#chart-display")
            .style("background-color", "white")
            .style("border", "1px solid black")
            .on("contextmenu", () => d3.event.preventDefault());

        this.ng = this.svg.append("g")
            .attr("id", "chart");
        
        this.drawLabels = true;
    },
    project: function(x, y) {
        // calculate node and link position For radial tree
        const angle = (x - 90) / 180 * Math.PI, radius = y;
        return [radius * Math.cos(angle), radius * Math.sin(angle)];
    },
    render: function(type) {
        this.ng.selectAll("*").remove(); // reset graph
        const {tree, root, color} = ctrlMain.getHierarchical(),
              {width, height} = ctrlMain.getDim();

        if (type === "radial-tree") {
            this.ng.attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");
        } else {
            this.ng.attr("transform", `translate(${ width * 0.08 }, ${ height * 0.05 })`);
            tree.size([height * 0.9, width * 0.8]);
        }

        tree(root);

        // Enter links
        const link = this.ng.selectAll(".link")
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
        const node = this.ng.selectAll("g.node")
            .data(root.descendants());
        
        const tooltip = d3.select(".tooltip"),  // Set up tooltip and context menu
            tooltipDuration = 500;

        const menu = [
            {
                title: "View MS Quantities",
                action: function(elm, d, i) {
                    // Search for intensity column
                    let data;
                    for (key in d.data) {
                        if (key.match(/;/)) {
                            data = d.data[key].split(";");
                            data = data.map((e) => parseFloat(e));
                            break;
                        }
                    }
                    if (!data) {
                        alert("No additional MS quantities for this dataset");
                        return;
                    }
                    
                    // Reset chart:
                    const svg = d3.select("#mini-chart");
                    svg.selectAll("*").remove();
                    const width = parseFloat(svg.style("width")),
                          height = parseFloat(svg.style("height"));
                    const margin = {
                        x: width * 0.1,
                        y: height * 0.1
                    }
                    const chart = d3.select("#mini-chart").append("g")
                        .style("transform", `translate(${margin.x}px, ${margin.y}px)`);

                    // Set up scales
                    const maxVal = d3.max(data);
                    const xScale = d3.scaleLinear()
                        .domain([0, maxVal])
                        .range([0, width - 2 * margin.x]);
                    const yScale = d3.scaleBand()
                        .domain(data.map( (d,i) => i ))
                        .range([0, height - 2 * margin.y])
                        .padding(0.5);
                    let xAxis = d3.axisBottom(xScale)
                        .ticks(5);
                    let yAxis = d3.axisLeft(yScale);

                    // Draw bar chart
                    const bars = chart.selectAll(".bar").data(data);
                    bars.enter().append("rect")
                        .attr("class", "bar")
                        .attr("height", yScale.bandwidth())
                        .attr("y", (d,i) => yScale(i))
                        .attr("width", (d) => xScale(d))
                        .attr("fill", "#2a5599");
                    
                    // Draw axes
                    svg.append("g")
                        .style("transform", `translate(${margin.x}px,${height - margin.y}px)`)
                        .call(xAxis);
                    svg.append("g")
                        .style("transform", `translate(${margin.x}px, ${margin.y}px)`)
                        .call(yAxis);
                }
            }
        ];

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
                
                viewTreeChart.render(ctrlMain.getChartType());
            })
            .on("contextmenu", d3.contextMenu(menu));
    
        // Update nodes
        let nodeUpdate = node.merge(nodeEnter)
            .classed("node-collapsed", d => d._children)
        if (type === "radial-tree") {
            nodeUpdate.attr("transform", d => "translate(" + this.project(d.x, d.y) + ")")
        } else {
            nodeUpdate.attr("transform", d => "translate(" + d.y + "," + d.x + ")") // simple tree
        }
    
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
            .style("font", "sans-serif")
            .style("font-size", 10)
            .style("fill", "black")
            .style("display", this.drawLabels ? "block" : "none")
            .text(d => d.id.substring(d.id.lastIndexOf("@") + 1));
        
        if (type === "radial-tree") {
            nodeUpdate.selectAll("text")
                .attr("dy", ".31em")
                .attr("x", d => d.x < 180 === !d.children ? 6 : -6)
                .attr("transform", d => "rotate(" + (d.x < 180 ? d.x - 90 : d.x + 90) + ")")
                .style("text-anchor", d => d.x < 180 === !d.children ? "start" : "end");
        } else {
            nodeUpdate.selectAll("text")
                .attr("dy", 4)
                .attr("x", d => d.depth === 0 ? -90 : 6)
                .style("text-anchor", "start");
        }
        // Exit Notes
        node.exit().remove();
    }
}
