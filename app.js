// Install these packages via npm: npm install express aws-sdk multer multer-s3
// Documentation for JavaScript AWS SDK v3
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html

// https://docs.aws.amazon.com/sns/latest/dg/example_sns_Publish_section.html
// https://github.com/aws/aws-sdk-js-v3
// https://github.com/aws/aws-sdk-js-v3#getting-started
//const { SecretsManagerClient, ListSecretsCommand, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import

const { SNSClient, ListTopicsCommand, GetTopicAttributesCommand, SubscribeCommand, PublishCommand } = require("@aws-sdk/client-sns");
const { S3Client, ListBucketsCommand, ListObjectsCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const { RDSClient, DescribeDBInstancesCommand } = require("@aws-sdk/client-rds");

const express = require('express')
const app = express();
const multer = require('multer')
const multerS3 = require('multer-s3')
const REGION = "us-east-1"; //e.g. "us-east-1"
const s3 = new S3Client({ region: REGION });

var upload = multer({
    storage: multerS3({
        s3: s3,
        acl: 'public-read',
        bucket: "ykh-raw",
        key: function (req, file, cb) {
            cb(null, file.originalname);
        }
    })
});

async function getSecretARN() {
  const client = new SecretsManagerClient({ region: "us-east-2" });
  const command = new ListSecretsCommand({});
  try {
   const results = await client.send(command);
    //console.log(results.SecretList[0].ARN);
   return results;

  } catch (err) {
    console.error(err);
  }
}

const getSecrets = async () => {
  
  let secretARN = await getSecretARN();
	//console.log("Secret ARN: ",secretARN.SecretList[0].ARN);
  const params = {
	  SecretId: secretARN.SecretList[0].ARN
  };
  const client = new SecretsManagerClient({ region: "us-east-2" });
  const command = new GetSecretValueCommand(params);
  try {
    const results = await client.send(command);
    //console.log(results);
    return results; 
  } catch (err) {
    console.error(err);
  }
};

const getListOfSnsTopics = async () => {
  const client = new SNSClient({ region: "us-east-2" });
  const command = new ListTopicsCommand({});  
    try {
    const results = await client.send(command);
    //console.log("Get SNS Topic Results: ", results);
    //console.log("ARN: ", results.Topics[0].TopicArn); 
    //return results.Topics[0]; 
    return results; 
  } catch (err) {
    console.error(err);
  }
};
const getSnsTopicArn = async () => {
	
        let snsTopicArn = await getListOfSnsTopics();
//	console.log(snsTopicArn.Topics[0].TopicArn);
	const params = {
		TopicArn: snsTopicArn.Topics[0].TopicArn
	};
	const client = new SNSClient({region: "us-east-2" });
        const command = new GetTopicAttributesCommand(params);
	try {
		const results = await client.send(command);
		//console.log("Get SNS Topic Properties results: ",results);
		return results;
	} catch (err) {
		console.error(err);
	}
};

const subscribeEmailToSNSTopic = async () => {

        let topicArn = await getListOfSnsTopics();
	const params = {

		Endpoint: "",
		Protocol: 'email',
		TopicArn: topicArn.Topics[0].TopicArn
	}

        const client = new SNSClient({region: "us-east-2" });
        const command = new SubscribeCommand( params );
        try {
                const results = await client.send(command);
                console.log("Subscribe Results: ", results);
	        return results; 	
	     
        } catch (err) {
                console.error(err);
        }
};

const sendMessageViaEmail = async () => {

	let publishMessage = await listObjects();
	let snsTopicArn = await getListOfSnsTopics();
	const params = {
		Subject: "Your imgage is ready!",
		Message: publishMessage,
		TopicArn: snsTopicArn.Topics[0].TopicArn
	};
	const client = new SNSClient({region: "us-east-2" });
	const command = new PublishCommand(params);
	try {
		const results = await client.send(command);
		//console.log("Send message results: ", results);
		return results;
	
} catch (err) {
	console.error(err);
}
};

const listBuckets = async () => {

	const client = new S3Client({region: "us-east-1" });
        const command = new ListBucketsCommand({});
	try {
		const results = await client.send(command);
		console.log("List Buckets Results: ", results.Buckets[0].Name);
		const params = {
			Bucket: results.Buckets[1].Name
		}
		return params;
	
} catch (err) {
	console.error(err);
}
};

const listObjects = async () => {
	const client = new S3Client({region: "us-east-1" });
	const command = new ListObjectsCommand(await listBuckets());
	try {
		const results = await client.send(command);
		console.log("List Objects Results: ", results);
	        const url = "https://" + results.Name + ".s3.amazonaws.com/" + results.Contents[0].Key;	
		console.log("URL: " , url);
		return url;
	} catch (err) {
		console.error(err);
	}
};

const getPostedData = async (req,res) => {
	try {
	let s3URL = await listObjects();
	res.write('Successfully uploaded ' + req.files.length + ' files!')

	var username = req.body['name'];
	var email = req.body['email'];
	var phone = req.body['phone'];
        res.write(username + "\n");
	res.write(s3URL + "\n");
        res.write(email + "\n");
        res.write(phone + "\n");

        res.end();
	} catch (err) {
                console.error(err);
        }
}; 

const getImagesFromS3Bucket = async (req,res) => {
	try {
		let imageURL = await listObjects();
	res.set('Content-Type', 'text/html');	
        res.write("Welcome to the gallery" + "\n");
        res.write('<img src="' + imageURL + '" />'); 
        res.end(); 
	} catch (err) {
                console.error(err);
        }
};

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/gallery', function (req, res) {

(async () => {await getImagesFromS3Bucket(req,res) } ) ();

});

app.post('/upload', upload.array('uploadFile',1), function (req, res, next) {

(async () => { await getPostedData(req,res) } ) (); 
(async () => { await getListOfSnsTopics(); })();
(async () => { await getSnsTopicArn() })();
(async () => { await subscribeEmailToSNSTopic() } ) ();
(async () => { await sendMessageViaEmail() } ) ();
});

app.listen(80, function () {
    console.log('Amazon s3 file upload app listening on port 80');
   // (async () => console.log(await getSecretARN()))();
});
