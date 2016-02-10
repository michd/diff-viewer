# Diff Viewer

A simple web diff viewer. Upload .diff file, get html page for easy digestion. Created as a workaround for GitHub's file limits on diffs.

"Finished" and working. The code is ugly, hardly documented anywhere, but as a neat additional feature, it also works.

I'll write up a better readme for setting this up and warnings and whatnot at some point. Essentially just run index.json and point your browser at the server it puts up.

There's no authentication built in or anything, nor any protection against spamming the living hell out it. I'm using it behind http basic auth set up in nginx, which should normally be sufficient to prevent abuse.

---

## Installation steps
These assume node and npm are installed.

### 1. Clone to a directory accessible by your nginx user
```
$ git clone git@github.com:michd/diff-viewer.git
$ cd diff-viewer
```
### 2. Install packages
```
$ npm install
```
### 3. Create directory for storing diffs
This will at some point be done automatically but isn't right now. This is hardcoded, so it should be exactly this directory. Another thing to address in code later.
```
$ mkdir -p content/diff
```
### 4. Configure server
Assuming nginx here. Add the following  server to your nginx config. I've got it set up as a separate files under conf/sites-available, then symlinked into conf/sites-enabled.

```
upstream node_diff {
    server 127.0.0.1:1338 # This port is again, hardcoded, but could be configured. Change it in index.js
    keepalive 8;
}

server {
    listen 80;
    listen [::]:80;
    
    server_name your_server_name_here.com;
    location / {
        proxy_set_header X-Real-Ip $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-NginX-Proxy true;
        
        proxy_pass http://node_diff/;
        proxy_redirect off;
        
        client_max_body_size 20m;
        
        # Optional: http basic auth, uncomment if needed
        # auth_basic "Any auth instructions here"
        # auth_basic_user_file /path/to/htpasswd_file
    }
    
    # Optionally add your SSL config
}
```

### 5. Add a little startup bash script in the repo
This is probably unnecessary but was my workaround for some issues relating to the init script below. After you've created the file, make it executable with `$ chmod +x start`

```
#!/bin/bash

cd /repo/path/

node index.js
```

### 6. Set up an init script
This is how I've got it set up on an Ubuntu 14.04 server
This is a called /etc/init/node-diff.conf:

```
description "node.js server for diff viewer"
author "Mich"

start on started mountall
stop on shutdown

# Automatically  Respawn:
respawn
respawn limit 99 5

script
  export HOME="/home/<username>"
  exec sudo -u <username> /repo/path/here/./start >> /log/file/location/log.log 2>&1
end script

post-start script
end script
```

### 7. Kick things off
Start the init script, restart nginx

```
$ sudo start node-diff

$ sudo restart nginx
# or
$ sudo service nginx restart
# depending on how you've got nginx installed
```

### 8. That's it!
