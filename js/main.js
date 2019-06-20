let model = {
    dim: {
        width: window.innerWidth - 150,
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
        this.onFileChange();
    },
    onFileChange: function() {
        const sample1 = document.querySelector("#load-sample-1"),
            sample2 = document.querySelector("#load-sample-2"),
            upload = document.querySelector("#file-upload");
        
        sample1.addEventListener("click", () => {
            d3.csv("csv/big_sample.csv").then(d => ctrlMain.fileHandler(d));
        });
        sample2.addEventListener("click", () => {
            d3.csv("csv/small_sample.csv").then(d => ctrlMain.fileHandler(d));
        });

        upload.addEventListener("change", (e) => {
            const file = e.target.files[0];
            ctrlMain.fileHandler(file);
        });
    },
    fileHandler: function(file) {
        fileTypeCSV = /csv.*/;

        if (file.length) {  // for sample data (rework later)
            this.buildHierarchy(file);
            viewTreeChart.render();
            viewZoom.render();
            ctrlToolbar.init();
        } else if (!file.name.match(fileTypeCSV)) { // for uploaded files
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
        // Export buttons
        d3.select("#convert-svg").on("click", () => {
            if (!viewTreeChart.ng) {
                alert("No chart to export!")
            } else {
                const svgData = document.querySelector("#chart-display").outerHTML,
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
