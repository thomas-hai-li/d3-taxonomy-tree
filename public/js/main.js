let model = {
    dim: {
        width: parseInt(d3.select("#chart-display").style("width")),
        height: parseInt(d3.select("#chart-display").style("height"))
    },
    chartType: "default",
    currentData: null,
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
            },
            // Color schemes for nodes:
            taxonLevelColor: d3.scaleOrdinal()
                .domain(d3.range(0, 10))
                .range(d3.schemeAccent),
            branchColor: d3.scaleOrdinal()
                .range(d3.schemeSet3)
        }
    },
}

let ctrlMain = {
    // Responsible for file handling, building charts, and getting data from model
    init: function() {
        viewDatasets.init();
        viewTreeChart.init();
        viewHierarchicalBarChart.init();
        viewZoom.init();
        // viewBrush.init();
        this.onFileChange();
        this.onChartTypeChange();
    },
    onFileChange: function() {
        const sampleData = document.querySelectorAll(".sample-data"),
            upload = document.querySelector("#file-upload");
        
        // For immediately loading data
        sampleData.forEach((sample) => {
            sample.addEventListener("click", () => {
                const fileName = sample.textContent;
                this.setCurrentData(fileName);
                d3.csv(`csv/${fileName}`).then(d => {
                    sessionStorage[fileName] = d;       // store as string, not array
                    console.log(d);
                    ctrlMain.buildChart(d)});
            });
        });

        // For uploading
        upload.addEventListener("change", (e) => {
            const files = e.target.files,
                fileTypeCSV = /csv.*/;
            let hasInvalid = false;

            for(let i = 0; i < files.length; i++) {
                if (files[i].name.match(fileTypeCSV)) {
                    // Add to dataset view
                    const file = files[i];
                    viewDatasets.addFile(file.name);
                    // Bind data to element
                    const elem = document.getElementById(file.name);
                    const reader = new FileReader();
                    reader.onload = () => {
                        sessionStorage[file.name] = reader.result;
                        elem.addEventListener("click", () => {
                            this.setCurrentData(file.name);
                            const data = d3.csvParse(sessionStorage[file.name]);    // array of objects
                            this.buildChart(data);
                        });
                    }
                    reader.readAsText(file);
                }
                else {
                    hasInvalid = true;
                }
            }
            if (hasInvalid) {
                $("#warning-modal").modal()
            }
        });
    },
    onChartTypeChange: function() {
        const chartSelection = document.getElementById("chart-selection");
        chartSelection.addEventListener("change", () => {
            const type = chartSelection.value;
            const currentData = this.getCurrentData();
            this.setChartType(type);
            if (currentData) {
                const data = d3.csvParse(sessionStorage[currentData]);
                this.buildChart(data);
            }
        });
    },
    buildChart: function(data) {
        // Accepts array of objects (csv) as data
        const type = this.getChartType();
        document.querySelector("#chart-display").style.display = "block";
        document.querySelector("#csv-display").style.display = "none";
        switch (type) {
            case "default":
            case "simple-tree":
            case "radial-tree":
                this.buildRoot(data);
                this.buildTree();
                viewTreeChart.render(type);
                // viewZoom.render(type);
                // viewBrush.render();
                ctrlToolbar.init();
                viewMiniChart.init(data);
                break;
            case "hierarchical-bars":
                this.buildRoot(data);
                viewHierarchicalBarChart.render();
                // render barchart
                // disable toolbar
                // disable mini chart?
        }
    },
    buildRoot: function(data) {
        // Generate the root data structure
        let stratify = d3.stratify()
            .parentId(d => d.id.substring(0, d.id.lastIndexOf("@")));
        let root = stratify(data);

        model.hierarchical.root = root;
    },
    buildTree: function() {
        // Generate the tree layout function
        // const { width, height } = this.getDim();
        const tree = d3.tree()
            .size([360, 500])
            .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

        model.hierarchical.tree = tree;
    },
    setCurrentData: (data) => model.currentData = data,
    getCurrentData: () => model.currentData,
    setChartType: (type) => model.chartType = type,
    getChartType: () => model.chartType,
    getDim: () => model.dim,
    getHierarchical: () => model.hierarchical
}

let ctrlToolbar = {
    init: function() {
        // Export buttons
        d3.select("#convert-svg").on("click", () => {
            if (!viewTreeChart.ng) {
                alert("No chart to export!")
            } else {
                // Really hacky, pls rework
                let svgData = document.querySelector("#chart-display").outerHTML.replace("</svg>", "<style>"),
                    sheets = document.styleSheets,
                    style;
                for (let i = 0; i < sheets.length; i++) {
                    if (sheets[i].href.match("charts.css")) {style = sheets[i].cssRules || sheet[i].rules;}
                }
                for (let i = 0; i < style.length; i++) {
                    svgData += style[i].cssText;
                }
                svgData += "</style></svg>";
                
                let svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"}),
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
        const duration = 500;
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
            const { color } = ctrlMain.getHierarchical();
            const { taxonLevelColor, branchColor } = color;
            color.currentRank = parseInt(colorSlider.valueOf()._groups[0][0].value);
            colorLabel.text(color.ranks[color.currentRank]);
            d3.selectAll(".node circle")
                .style("fill", (d) => viewTreeChart.colorNode(d, taxonLevelColor, branchColor))
        });
    }
}

ctrlMain.init();
