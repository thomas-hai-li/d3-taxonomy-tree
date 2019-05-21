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

d3.csv("tree_chart.csv").then(d => showData(d));
let display = {};

function showData(data) {
    // Setup: window dimensions and elements
    const config = setup();
    // Build Tree: obtain tree and root
    const treeData = buildTree(config, data);
    // Update: draw nodes and links
    update(treeData);
    // Interactivity: enable zoom and toolbar
    enableZoom();
    enableToolbar();
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
    
    return { tree, root };
}

function update(treeData) {
    let { ng } = display;
    let { tree, root } = treeData;

    // Draw links
    let color = d3.scaleOrdinal(d3.schemeCategory10);

    let link = ng.selectAll(".link")
        .data(tree(root).descendants().slice(1))    // array of descendants excluding index 0 (cellular organisms has no parent)
        .enter().append("path")
        .attr("class", "link")
        .style("stroke", color)
        .style("fill", "none")
        .style("stroke-opacity", 0.4)
        .style("stroke-width", 1)
        .attr("d", d => {
            return "M" + d.y + "," + d.x                            // Move to coords (y,x), this is flipped to make the tree horizontal instead of vertical
                + "C" + (d.y + d.parent.y) / 2 + "," + d.x          // Draw a cubic Bézier curve
                + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
                + " " + d.parent.y + "," + d.parent.x;
        });
    
    // Draw nodes
    let node = ng.selectAll(".node")
        .data(root.descendants())   // array of all descendants
        .enter().append("g")
        .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")")
    
    let tooltip = d3.select("body").append("div").attr("class", "tooltip")  // will contain tooltip upon node hover

    node.append("circle")
        .attr("r", d => Math.log10(d.data.value) + 2)
        .style("fill", d => d.children ? "#555" : "#555")
        .style("opacity", 0.7)
        .on("mouseover", d => {
            tooltip.transition()
                .duration(500)
                .style("opacity", .9);
            tooltip.html("Value: " + d.data.value)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 20) + "px");
        })
        .on("mouseout", d => {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    node.append("text")
        .attr("class", "nodeLabel")
        .attr("dy", 4)
        .attr("x", d => d.depth === 0 ? -105 : 6)
        .style("text-anchor", d => d._children ? "end" : "start")
        .style("font", "sans-serif")
        .style("font-size", 10)
        .style("fill", "black")
        .text(d => d.id.substring(d.id.lastIndexOf("@") + 1))
}

function enableZoom() {
    // Enables zoom + pan, and zoom buttons on the toolbar
    let { svg, ng } = display;
    let zoom = d3.zoom()
        .scaleExtent([0.4, 10])
        .on("zoom", zoomed);

    function zoomed() {
        let transform = d3.event.transform;

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

    d3.select("#ZoomIn").on("click", () => {
        zoom.scaleBy(svg.transition().duration(300), 1.3);
    })

    d3.select("#ZoomOut").on("click", () => {
        zoom.scaleBy(svg.transition().duration(300), 1 / 1.3);
    })
}

function enableToolbar() {
    const labels = document.querySelectorAll(".nodeLabel");
    d3.select("#Toolbar").attr("class", "onView")

    // Font buttons
    d3.select("#fontUp").on("click", () => {
        for (let i = 0; i < labels.length; i++) {
            let currentFont = labels[i].style.fontSize;
            let fontSize = parseFloat(currentFont.slice(0, currentFont.indexOf("p"))) // strip off "px"

            if (fontSize < 20) {
                labels[i].style.fontSize = fontSize + 1;
            }
        }
    });

    d3.select("#fontDown").on("click", () => {
        for (let i = 0; i < labels.length; i++) {
            let currentFont = labels[i].style.fontSize;
            let fontSize = parseFloat(currentFont.slice(0, currentFont.indexOf("p"))); // strip off "px"

            if (fontSize > 9) {
                labels[i].style.fontSize = fontSize - 1;
            }
        }
    });

    // Toggle buttons
    let nodeCircles = document.querySelectorAll("circle");

    d3.select("#ToggleNodeCircles").on("click", () => {
        for (let i = 0; i < nodeCircles.length; i++) {
            nodeCircles[i].classList.toggle("node-normalized");
        }
    });

    d3.select("#ToggleNodeLabels").on("click", () => {
        for (let i = 0; i < labels.length; i++) {
            labels[i].classList.toggle("hideElement");
        }
    });
}
