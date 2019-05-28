// File upload:
let input = document.querySelector("input");

input.addEventListener("change", (e) => {
    let file = e.target.files[0];
    fileInputHandler(file);
});

function fileInputHandler(file) {
    let fileTypeCSV = /csv.*/;

    if (file.name.match(fileTypeCSV)) {
        let reader = new FileReader();
        reader.onload = e => {
            data = reader.result;                   // string of csv
            parsedData_tree = d3.csvParse(data);    // array of csv entries
            showData(parsedData_tree);
        }
        reader.readAsText(file);
    } else {
        alert("File format not supported!");
    }
}

// APP MAIN:

d3.csv("big_sample.csv").then(d => showData(d));
let display = {},
    treeData = {};

function showData(data) {
    let config = setup();       // Setup: window dimensions and elements
    buildTree(config, data);    // Build Tree: obtain tree and root
    update(treeData.root);      // Update: draw nodes and links

    enableZoom();    // re-enable once collapsing nodes can be smoothly integrated with zoom 
}

function setup() {
    const width = window.innerWidth - 20,
        height = window.innerHeight - 100;
    
    let svg = d3.select("#Display")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "white")
        .style("border", "1px solid black");
        
    let ng = svg.append("g").attr("transform", "translate(150,50)");

    display = { svg, ng }
    return { width, height };
}

function buildTree(setup, data) {
    const { width, height } = setup;

    const tree = d3.tree()
        .size([height - 100, width - 500]);

    const stratify = d3.stratify()
        .parentId(d => d.id.substring(0, d.id.lastIndexOf("@")));

    const root = stratify(data)
        .sort((a, b) => (a.height - b.height) || a.id.localeCompare(b.id));

    treeData = { tree, root };
}

function update(source) {
    const { ng } = display,
        { tree, root } = treeData,
        tooltipDuration = 500,
        updateDuration = 2000;
    
    tree(root);

    // Enter links
    let link = ng.selectAll(".link")
        .data(root.descendants().slice(1));

    let linkEnter = link.enter().append("path")
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
    let node = ng.selectAll("g.node")
        .data(root.descendants());
    
    let tooltip = d3.select(".tooltip");
    
    let nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .on("mouseover", d => {
            tooltip.transition()
                .duration(tooltipDuration)
                .style("opacity", .9);
            tooltip.html("Value: " + d.data.value + "<br>")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 20) + "px");
        })
        .on("mouseout", d => {
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
            // Remove the tooltip
            tooltip.transition()
                .duration(tooltipDuration)
                .style("opacity", 0);

            update(d);
        });

    // Update nodes
    let nodeUpdate = node.merge(nodeEnter)
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")")
        .classed("node-collapsed", d => d._children);

    nodeUpdate.selectAll("circle").remove();
    nodeUpdate.selectAll("text").remove();

    const color = d3.scaleOrdinal()
        .domain(d3.range(0, 10))
        .range(d3.schemeCategory10);

    nodeUpdate.append("circle")
        .attr("r", d => Math.log10(d.data.value + 1) + 2)
        .style("fill", d => {
            id = d.id;
            count = (id.match(/@/g) || []).length;
            return color(count);
        })
        .style("opacity", 0.7);

    nodeUpdate.append("text")
        .attr("class", "nodeLabel")
        .attr("dy", 4)
        .attr("x", d => d.depth === 0 ? -105 : 6)
        .style("text-anchor", "start")
        .style("font", "sans-serif")
        .style("font-size", 10)
        .style("fill", "black")
        .text(d => d.id.substring(d.id.lastIndexOf("@") + 1));
    
    // Exit Notes
    node.exit()
        .attr("transform", d => "translate(" + d.parent.y + "," + d.parent.x + ")")
        .style("fill-opacity", 0)
        .remove()

    enableToolbar();
}

function enableZoom() {
    // Enables zoom + pan, and zoom buttons on the toolbar
    let { svg, ng } = display;
    let zoom = d3.zoom()
        .scaleExtent([0.4, 10])
        .on("zoom", zoomed);

    function zoomed() {
        let transform = d3.event.transform;

        // This type of zoom integrates well with the collapse-node feature
        // ng.attr('transform', transform);

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

    svg.call(zoom);
    
    // Setup zoom on toolbar:
    let duration = 2000;
    d3.select("#ZoomIn").on("click", () => {
        zoom.scaleBy(svg.transition().duration(duration), 1.3);
    })
    d3.select("#ZoomOut").on("click", () => {
        zoom.scaleBy(svg.transition().duration(duration), 1 / 1.3);
    })
}

function enableToolbar() {
    const labels = document.querySelectorAll(".nodeLabel");
    d3.select("#Toolbar").attr("class", "onView")

    // Font buttons
    d3.select("#fontUp").on("click", () => {
        for (let i = 0; i < labels.length; i++) {
            let fontSize = parseFloat(labels[i].style.fontSize);
            if (fontSize < 20) {
                labels[i].style.fontSize = fontSize + 1;
            }
        }
    });

    d3.select("#fontDown").on("click", () => {
        for (let i = 0; i < labels.length; i++) {
            let fontSize = parseFloat(labels[i].style.fontSize);
            if (fontSize > 9) {
                labels[i].style.fontSize = fontSize - 1;
            }
        }
    });

    // Toggle buttons
    let nodes = document.querySelectorAll(".node");

    d3.select("#ToggleNodeCircles").on("click", () => {
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].classList.toggle("node-normalized");
        }
    });

    d3.select("#ToggleNodeLabels").on("click", () => {
        for (let i = 0; i < labels.length; i++) {
            labels[i].classList.toggle("hideElement");
        }
    });
}
