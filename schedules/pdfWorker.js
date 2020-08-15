//GIST from: https://gist.github.com/leedongwei/6015450165b70a32b72cdebc073714ab
window = this;
document = { createElementNS: function() { return {}; } };
importScripts('pdfMake_v0.1.36.min.js');
importScripts('vfs_fonts.js');
onmessage = function(req) { new Promise(function (resolve, reject) { generatePdfBlob(req.data, function (result) { if (result) { resolve(result); } else { reject(); } }); }).then(function(pdfBlob) { postMessage({ pdfBlob }); }); };
function generatePdfBlob(pdfData, callback) { if (!callback) { throw new Error('This is an async method and needs a callback'); } var docDefinition = JSON.parse(pdfData); pdfMake.createPdf(docDefinition).getBlob(callback); }