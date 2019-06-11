let model = {
    dim: {
        width: window.innerWidth - 20,
        height: window.innerHeight - 100
    },
    hierarchical: {
        tree: null,
        root: null,
        color: {
            currentRank: 2,
            ranks: {
                // Keys based on number of "@" in the id of each data point
                2: "Kingdom",
                3: "Phylum",
                4: "Class",
                5: "Order",
                6: "Family",
                7: "Genus",
                8: "Species"
            }
        }
    },
}

let ctrlMain = {
    init: function() {
        viewTreeChart.init();
        viewZoom.init();
        this.onFileUpload();
    },
    onFileUpload: function(){
        const upload = document.querySelector("#file-upload");

        upload.addEventListener("change", (e) => {
            const file = e.target.files[0],
                fileTypeCSV = /csv.*/;

            if (!file.name.match(fileTypeCSV)) {
                alert("File format not supported!");
            } else {
                const reader = new FileReader();
                reader.readAsText(file);
                reader.onload = () => {
                    data = reader.result;                   // string of csv
                    let parsedCSV = d3.csvParse(data);      // array of csv entries
                    this.buildHierarchy(parsedCSV);
                    viewTreeChart.render();
                    viewZoom.render();
                    ctrlToolbar.init();
                }
            }
        });
    },
    buildHierarchy: function(data) {
        // Generate tree (function) and root (structure)
        const { width, height } = this.getDim();
        const tree = d3.tree()
            .size([height - 100, width - 500]);
        const stratify = d3.stratify()
            .parentId(d => d.id.substring(0, d.id.lastIndexOf("@")));
        const root = stratify(data)
            .sort((a, b) => (a.height - b.height) || a.id.localeCompare(b.id));

        model.hierarchical.tree = tree;
        model.hierarchical.root = root;
    },
    getDim: () => model.dim,
    getHierarchical: () => model.hierarchical
}

let ctrlToolbar = {
    init: function() {
        d3.select("#toolbar")
            .attr("class", "onView");

        // Export buttons
        d3.select("#convert-svg").on("click", () => {
            if (!viewTreeChart.ng) {
                alert("No chart to export!")
            } else {
                const svgData = document.querySelector("svg").outerHTML,
                    svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"}),
                    svgUrl = URL.createObjectURL(svgBlob),
                    downloadLink = document.createElement("a");
        
                downloadLink.href = svgUrl;
                downloadLink.download = "visualization.svg";
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
        });

        // Toggle buttons
        d3.select("#toggle-node-circles").on("click", () => {
            d3.selectAll(".node")
                .classed("node-normalized", d3.selectAll(".node").classed("node-normalized") ? false : true);
        });
        d3.select("#toggle-node-labels").on("click", () => {
            let labels = d3.selectAll(".nodeLabel"),
                display = labels.style("display");
            
            if (display === "block") {
                labels.style("display", "none");
                viewTreeChart.drawLabels = false;
            } else {
                labels.style("display", "block");
                viewTreeChart.drawLabels = true;
            }
        });

        // Zoom buttons
        const duration = 2000;
        d3.select("#zoom-in").on("click", () => {
            viewZoom.zoom
                .scaleBy(viewZoom.svg.transition().duration(duration), 1.3);
        });
        d3.select("#zoom-out").on("click", () => {
            viewZoom.zoom
                .scaleBy(viewZoom.svg.transition().duration(duration), 1 / 1.3);
        });

        // Font buttons
        d3.select("#font-up").on("click", () => {
            let labels = d3.selectAll(".nodeLabel"),
                fontSize = parseInt(labels.style("font-size"));
            if (fontSize < 20) {
                labels.style("font-size", ++fontSize + "px")
            }
        });
        d3.select("#font-down").on("click", () => {
            let labels = d3.selectAll(".nodeLabel"),
                fontSize = parseInt(labels.style("font-size"));
            if (fontSize > 9) {
                labels.style("font-size", --fontSize + "px")
            }
        });

        // Color Slider
        const colorSlider = d3.select("#color-slider"),
            colorLabel = d3.select("#color-rank");
        
        colorSlider.attr("disabled", null);
        colorSlider.on("input", () => {
            const {color} = ctrlMain.getHierarchical();
            
            color.currentRank = parseInt(colorSlider.valueOf()._groups[0][0].value);
            colorLabel.text(color.ranks[color.currentRank]);
            viewTreeChart.render();
        });
    }
}

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

let viewZoom = {
    init: function() {
        this.svg = d3.select("#chart-display");
        this.ng = d3.select("#chart");
    },
    render: function() {
        this.zoom = d3.zoom()
                .scaleExtent([0.4, 10])
                .on("zoom", zoomed),
            ng = this.ng;
    
        function zoomed() {
            const transform = d3.event.transform;

            // scale nodes
            ng.selectAll(".node").attr("transform", d => {
                return "translate(" + transform.applyX(d.y) + "," + transform.applyY(d.x) + ")";
            });

            // scale links
            ng.selectAll(".link").attr("d", d => {
                return "M" + transform.applyX(d.y) + "," + transform.applyY(d.x)
                    + "C" + (transform.applyX(d.y) + transform.applyX(d.parent.y)) / 2 + "," + transform.applyY(d.x)
                    + " " + (transform.applyX(d.y) + transform.applyX(d.parent.y)) / 2 + "," + transform.applyY(d.parent.x)
                    + " " + transform.applyX(d.parent.y) + "," + transform.applyY(d.parent.x);
            });
        }
        this.svg.call(this.zoom);
    }
}

ctrlMain.init();
