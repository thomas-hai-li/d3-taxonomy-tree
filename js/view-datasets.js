let viewDatasets = {
    addFile: function(fileName) {
        let newFileListing = document.createElement("option"),
            newFileName = document.createTextNode(fileName),
            datasets = document.querySelector("#uploaded-files");
        
        newFileListing.id = fileName;
        newFileListing.appendChild(newFileName);
        datasets.appendChild(newFileListing);
    }
}
