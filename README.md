#CloudSeed
_def: The process of controlled atmospheric interruptions in order to stimulate cloud formation_

Cloudseed is a substitute control plane. Instead of making untraceable changes to stacks directly through the amazon API, Cloudseed uses the Cloudformation API to submit stack templates. These templates can be checked in to change tracking, and any changes are recorded and reversible.

##Cloudformation
Previously, in order to create a stack through Cloudformation, several generic templates would be used. One template may create a VPC, another could create 2 subnets, and a third would create an EC2 instance along with some appropriate security groups. Each time a stack needed one or more of these, a new file with the relevant parameters for each template would be created. This lead to problems finding where changes needed to be made in order to add functionality.

##CloudSeed is better
Instead, why not have one file per stack, and add/remove/edit that file in order to alter the stack? That would fix the searching, allow for easy change tracking, and reduce the labor needed to add or remove component of the stack. Without Cloudseed, this would be accomplished through tedious file editing, with much code duplication. Copy and paste would be a regular event, and human error would become a huge problem. In my experience, buttons are far easier.

##How to
Cloudseed is an __internally deployed solution__. This means that there is no single location for Cloudseed (this may change), but instead a single location for each group using it. You are responsible for deploying the instance you will use.

###1. Deploy/configure the instance -
Clone, fork, or download the code for Cloudseed, and send it to a server. This server will need access to AWS (either via internet or being in the AWS cloud) and need open inbound access on the express port (default 3000) to a range accessible by your team as well as a valid mongo server. Navigate to the Cloudseed folder and edit the `config.json.sample` file with the appropriate info, then save it as `config.json`. If you are using Mongo, run mongoinit.sh then start node with `nohup node app.js &`.

###2. Add users -
Visit the IP or domain name of your deployed instance and add a user for yourself. This will require a name, Email, and AWS credentials.

###3. Begin building your stack! -
Click the buttons corresponding to the components you need. They will be added on the right, and clicking their name will open a panel to add parameters. Once all required parameters (including stack name at the top!) are filled, the stack can be saved.

###4. Send the stack to AWS -
All saved stacks are visible under the "Build" menu on the navbar. Clicking one will send the template to Cloudformation for immediate construction using your user keys.
