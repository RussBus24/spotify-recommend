var unirest = require('unirest');
var express = require('express');
var events = require('events');
var app = express();

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
           .qs(args)
           .end(function(response) {
                if (response.ok) {
                    emitter.emit('end', response.body);
                }
                else {
                    emitter.emit('error', response.code);
                }
            });
    return emitter;
};

app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        var relatedRequest = getFromApi('artists/' + artist.id + '/related-artists');
        relatedRequest.on('end', function(result) {
            artist.related = result.artists;
            var count = 0;
            artist.related.forEach(function(relatedArtist) {
            var tracksRequest = getFromApi('artists/' + relatedArtist.id + '/top-tracks?country=SE');
                
                tracksRequest.on('end', function(result) {
                    relatedArtist.tracks = result.tracks;
                    count++;
                    if (count === artist.related.length) {
                        res.json(artist);
                    }
                });
                    tracksRequest.on('error', function(code) {
                    res.sendStatus(code);
                    });
            });
               
        });
        relatedRequest.on('error', function(code) {
           res.sendStatus(code); 
        });
    
    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
});


app.listen(process.env.PORT || 8080);