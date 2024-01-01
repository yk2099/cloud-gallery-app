# Final Project: AWS Cloud Gallery App
The final project is a cloud native three-tier application with auto-scaling and load-balancing on EC2 instances. The application is created, deployed, and destroyed via the AWS CLI automated with bash shell scripts that read positional parameters. Users interact with a form upload an image which will send a notification to the host via AWS SNS. The images are stored and retrieved via AWS Buckets when users access the `/gallery` url. 
