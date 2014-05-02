var wikipediaHTMLResult = function(data) {
    var readData = $('<div>' + data.parse.text["*"] + '</div>');
 
    // handle redirects
    var redirect = readData.find('li:contains("REDIRECT") a').text();
    if(redirect != '') {
        callWikipediaAPI(redirect);
        return;
    }
    
    var box = readData.find('.infobox');
    
    var binomialName    = box.find('.binomial').text();
    var fishName        = box.find('th').first().text();
    var tbUrl        = null;
 
    // Check if page has images
    if(data.parse.images.length >= 1) {
        tbUrl        = box.find('img').first().attr('src');
    }
    
    $temps[0]={name:binomialName, image:tbUrl}
};
 
function callWikipediaAPI(wikipediaPage) {
    // http://www.mediawiki.org/wiki/API:Parsing_wikitext#parse
    $.getJSON('http://en.wikipedia.org/w/api.php?action=parse&format=json&callback=?', {page:wikipediaPage, prop:'text|images', uselang:'en'}, wikipediaHTMLResult);
}
