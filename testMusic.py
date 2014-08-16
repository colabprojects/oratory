
from gmusicapi import Mobileclient
import sys

api = Mobileclient()
logged_in = api.login('nslingham@gmail.com', '654261191')
# logged_in is True if login was successful

library = api.get_all_songs()
artists = [track['artist'] for track in library ]

nondupartists = list(set(artists))
uniartists = repr([x.encode(sys.stdout.encoding) for x in nondupartists]).decode('string-escape')

print uniartists

