#CloudSeed
_def: The process of controlled atmospheric interruptions in order to stimulate cloud formation_

Cloudseed is a substitute control plane. Instead of making untraceable changes to stacks directly through the amazon API, Cloudseed uses the Cloudformation API to submit stack templates. These templates can be checked in to change tracking, and any changes are recorded and reversible.

##Cloudformation
Previously, in order to create a stack through Cloudformation, several generic templates would be used. One template may create a VPC, another could create 2 subnets, and a third would create an EC2 instance along with some appropriate security groups. Each time a stack needed one or more of these, a new file with the relevant parameters for each template would be created. This lead to problems finding where changes needed to be made in order to add functionality.

##CloudSeed is better
Instead, why not have one file per stack, and add/remove/edit that file in order to alter the stack? That would fix the searching, allow for easy change tracking, and reduce the labor needed to add or remove component of the stack. Without Cloudseed, this would be accomplished through tedious file editing, with much code duplication. Copy and paste would be a regular event, and human error would become a huge problem. In my experience, buttons are far easier.

##How to
Cloudseed is an __internally deployed solution__. This means that there is no single location for Cloudseed (this may change), but instead a single location for each group using it. You are responsible for deploying the instance you will use. This helps to separate stacks between deployments and helps prevent overcrowding of the repos.

###1. Set up dependencies -
CloudSeed needs to be place on an EC2 instance created with a role which gives it SES send Email permissions. Therefore, the first step is to create a role with SES Send Mail permissions. I'd recommend also adding ReadOnly permissions, to prevent the CloudSeed box from having access to other services. Cloudformation permissions are evaluated using the logged in user's account, so they are unnecessary for the CloudSeed role. While in the AWS console, be sure to set up SES to allow sending from a verified domain, so that Cloudseed can verify user emails.

Once the role is created, spin up an EC2 instance using that role. We recommend a micro instance of ubuntu, but a CloudSeed image may soon be available.

SSH into the new box and install mongodb (if you want a local mongo server), nodejs, python3, and git.

Clone Cloudseed by typing `git clone git@github.com:careerbuilder/CloudSeed.git` and `cd` into the newly created directory.

Find and edit the `config.json.sample` file with the appropriate info, then save it as `config.json`.

If you are using a local Mongo instance, run `sh mongoinit.sh` to create the collections.

Start node with `nohup node app.js &`.

###2. Add users -
Congratulations by this step the app is live on your server, and you can begin adding users to the system!

Visit the IP or domain name of your deployed instance and navigate to the signup page. Signing up a user will require a name, Email, and AWS credentials. The AWS credentials come from a created AWS IAM users, so if you don't have any, be sure to make one for each user, giving them full Cloudformation permissions.

###3. Begin building your stack! -
Once logged in, you should be presented with a collection of parts with which you can build a stack.

Click the buttons corresponding to the components you need. They will be added on the right, and clicking their name will open a panel to add parameters. Once all required parameters are filled, the stack can be saved.

###4. Send the stack to AWS -
All saved stacks are visible under the "Build" dropdown. Clicking one will send the template to Cloudformation for immediate construction using your user keys.
