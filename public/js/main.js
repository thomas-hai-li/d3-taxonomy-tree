let model = {
    dim: {
        width: parseInt(d3.select("#chart-display").style("width")),
        height: parseInt(d3.select("#chart-display").style("height"))
    },
    chartType: "simple-tree",
    currentData: null,  // Array of objects, loaded from csv
    currentSample: null,  // String, determined from user selection
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
    // Responsible for file handling, building charts, and getting/setting data from model
    init: function() {
        viewSamples.init();
        viewTreeChart.init();
        viewHierarchicalBarChart.init();
        viewZoom.init();
        // viewBrush.init();
        this.onFileChange();
        this.onChartTypeChange();
        // Load data from global variable and save each node's value if it changes
        let dataParsed = JSON.parse(data);
        dataParsed = dataParsed.map((e) => {
            e._value = e.value;
            return e;
        });
        this.setCurrentData(dataParsed);
        this.parseSamples(this.getCurrentData());
        // Load the data immediately:
        this.buildChart(this.getCurrentData());
    },
    onFileChange: function() {
        const upload = document.querySelector("#file-upload");

        upload.addEventListener("change", (e) => {
            const file = e.target.files[0],
                fileTypeCSV = /csv.*/;

            if (file.name.match(fileTypeCSV)) {
                // parse the csv and set as current data
                const reader = new FileReader();
                reader.onload = () => {
                    const data = d3.csvParse(reader.result);    // array of objects
                    this.setCurrentData(data);
                    // Setup samples in the list
                    this.parseSamples(data);
                    // build the chart
                    this.buildChart(this.getCurrentData());
                }
                reader.readAsText(file);
            }
            else {
                $("#warning-modal").modal()
            }
        });
    },
    onChartTypeChange: function() {
        const chartSelection = document.getElementById("chart-selection");
        chartSelection.addEventListener("change", () => {
            const type = chartSelection.value,
                data = this.getCurrentData();
            this.setChartType(type);
            if (data) {
                this.buildChart(data);
            }
        });
    },
    parseSamples: function(data) {
        // Accepts array of objects as data, pareses for the individual samples and calls the view to render them.
        // In the csv, the column is usually formatted as such: "Intensity s1; Intensity s2; Intensity s3; ..."
        const col = Object.keys(data[0]).find((ele) => ele.match(/;/)),
            sampleNames = col.split(";");
        viewSamples.clearPrevious();
        sampleNames.forEach((sample) => {
            viewSamples.addSample(sample);
        });
        // On sample selection, display the correct information in chart
        d3.select("#samples")
            .on("change", function() {
                let sample = this.value,
                    index = sampleNames.indexOf(sample),
                    data = ctrlMain.getCurrentData();
                ctrlMain.setCurrentSample(sample);
                data.map((e) => {
                    let intensities = e[col].split(";").map((e) => Number(e));
                    e.value = intensities[index];
                    return e;
                });
                ctrlMain.buildChart(data);
            });
    },
    buildChart: function(data) {
        // Accepts array of objects (csv) as data
        const type = this.getChartType();
        document.querySelector("#chart-display").style.display = "block";
        document.querySelector("#csv-display").style.display = "none";

        switch (type) {
            case "simple-tree":
            case "radial-tree":
                this.buildRoot(data);
                this.buildTree();
                viewTreeChart.render(type);
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
    setCurrentSample: (sample) => model.currentSample = sample,
    getCurrentData: () => model.currentData,
    getCurrentSample: () => model.currentSample,
    setChartType: (type) => model.chartType = type,
    getChartType: () => model.chartType,
    getDim: () => model.dim,
    getHierarchical: () => model.hierarchical,
    submitFeedback: () => {
        let messageToUser = document.querySelector("#feedback-result"),
            name = document.querySelector("#feedback-name").value,
            organization = document.querySelector("#feedback-organization").value,
            comments = document.querySelector("#feedback-comments").value;

        if (comments === "") {
            messageToUser.textContent = "Form cannot be blank.";
        }
        else {
            let http = new XMLHttpRequest();
            http.open("POST", "/feedback", true);
            http.setRequestHeader("Content-type","application/x-www-form-urlencoded");
            let params = `name=${name}&` +
            `organization=${organization}&` + 
            `comments=${comments}`;
            http.send(params);
            messageToUser.textContent = "Submitted, thanks!";
        }
    }
}

let ctrlToolbar = {
    init: function() {
        // Export buttons
        d3.select("#convert-svg").on("click", () => {
            if (! document.querySelector("#chart-display g")) {
                alert("No chart to export!")
            } else {
                // Really hacky, pls rework
                let svgData = document.querySelector("#chart-display").outerHTML.replace("</svg>", "<style>"),
                    sheets = document.styleSheets,
                    style;
                for (let i = 0; i < sheets.length; i++) {
                    if (sheets[i].href && sheets[i].href.match("charts.css")) {style = sheets[i].cssRules || sheet[i].rules;}
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
