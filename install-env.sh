#!/bin/bash

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs

cd /home/ubuntu
sudo -u ubuntu npm install aws-sdk @aws-sdk/client-s3@3.202.0 express multer multer-s3 @aws-sdk/client-sns @aws-sdk/client-rds
sudo npm install pm2 -g

sudo -u ubuntu git clone git@github.com:itm/yhu78.git

cd /home/ubuntu/yhu78/itmo-444/mp2/

sudo pm2 start app.js

rm /home/ubuntu/.ssh/id_ed25519

