#!/bin/bash

SUBNET2A=$(aws ec2 describe-subnets --output=text --query='Subnets[*].SubnetId' --filter "Name=
availability-zone,Values=us-east-2a")
SUBNET2B=$(aws ec2 describe-subnets --output=text --query='Subnets[*].SubnetId' --filter "Name=
availability-zone,Values=us-east-2b")
VPCID=$(aws ec2 describe-vpcs --output=text --query='Vpcs[*].VpcId')

aws autoscaling create-launch-configuration --launch-configuration-name ${10} --image-id $1 --instance-type $2 --key-name $3 --security-groups $4 --iam-instance-profile ${21} --user-data file://install-env.sh

echo "Creating target group: $8"
# Create AWS elbv2 target group (use default values for health-checks)
TGARN=$(aws elbv2 create-target-group --name $8 --protocol HTTP --port 80 --target-type instance --vpc-id $VPCID --query="TargetGroups[*].TargetGroupArn")

# create AWS elbv2 load-balancer
echo "creating load balancer"
ELBARN=$(aws elbv2 create-load-balancer --security-groups $4 --name $7 --subnets $SUBNET2A $SUBNET2B --query='LoadBalancers[*].LoadBalancerArn')

# AWS elbv2 wait for load-balancer available
# https://awscli.amazonaws.com/v2/documentation/api/latest/reference/elbv2/wait/load-balancer-available.html
echo "waiting for load balancer to be available"
aws elbv2 wait load-balancer-available --load-balancer-arns $ELBARN
echo "Load balancer available"

# create AWS elbv2 listener for HTTP on port 80
#https://awscli.amazonaws.com/v2/documentation/api/latest/reference/elbv2/create-listener.html
aws elbv2 create-listener --load-balancer-arn $ELBARN --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=$TGARN

# Create autoscaling group
# https://awscli.amazonaws.com/v2/documentation/api/latest/reference/autoscaling/create-auto-scaling-group.html

echo "Launch configuration name is: ${10}"

aws autoscaling create-auto-scaling-group --auto-scaling-group-name ${9} --launch-configuration-name ${10} --min-size ${13} --max-size ${14} --desired-capacity ${15} --target-group-arns $TGARN  --health-check-type ELB --health-check-grace-period 600 --vpc-zone-identifier $SUBNET2A

# Retreive ELBv2 URL via aws elbv2 describe-load-balancers --query and print it to the screen
#https://awscli.amazonaws.com/v2/documentation/api/latest/reference/elbv2/describe-load-balancers.html
URL=$(aws elbv2 describe-load-balancers --output=json --load-balancer-arns $ELBARN --query='LoadBalancers[*].DNSName')
echo $URL

echo "creating secret"
aws secretsmanager create-secret --name ${20} --secret-string file://maria.json

USERVALUE=$(aws secretsmanager get-secret-value --secret-id ${20} --output=json | jq '.SecretString' | tr -s , ' ' | tr -s ['"'] ' ' | awk {'print $6'} |  tr -d '\\')
PASSVALUE=$(aws secretsmanager get-secret-value --secret-id ${20} --output=json | jq '.SecretString' | tr -s } ' ' | tr -s ['"'] ' ' | awk {'print $12'} | tr -d '\\')

echo "creating database"
aws rds create-db-instance --db-instance-identifier ${11} --db-instance-class db.t3.micro --engine ${16} --master-username $USERVALUE --master-user-password $PASSVALUE --allocated-storage 20 --backup-retention-period 1 --db-name ${17}

aws rds wait db-instance-available --db-instance-identifier ${11}

echo "creating read-only replica"
aws rds create-db-instance-read-replica --db-instance-identifier ${12} --source-db-instance-identifier ${11} --no-cli-pager

aws rds wait db-instance-available --db-instance-identifier ${12} --no-cli-pager
echo "read-replica ready"

echo "creating s3 buckets"
aws s3api create-bucket --bucket ${18} --region us-east-1
aws s3api create-bucket --bucket ${19} --region us-east-1

aws s3api wait bucket-exists --bucket ${18}
aws s3api wait bucket-exists --bucket ${19}
echo "s3 buckets made"

echo "creating secret"
aws sns create-topic --name ${22}