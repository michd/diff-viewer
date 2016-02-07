# Diff Viewer

A simple web diff viewer. Upload .diff file, get html page for easy digestion. Created as a workaround for GitHub's file limits on diffs.

"Finished" and working. The code is ugly, hardly documented anywhere, but as a neat additional feature, it also works.

I'll write up a better readme for setting this up and warnings and whatnot at some point. Essentially just run index.json and point your browser at the server it puts up.

There's no authentication built in or anything, nor any protection against spamming the living hell out it. I'm using it behind http basic auth set up in nginx, which should normally be sufficient to prevent abuse.
