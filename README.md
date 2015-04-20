#Cloud_Seed
_def: The process of controlled atmospheric interruptions in order to stimulate cloud formation_

##Requirements
 - AWS user with full cloud formation permissions
 - AWS cli
 - python 2+
 - boto for python (`pip install boto`)
 
 _A note about python3: The boto v2 library required by this code has a conflict with python 3. In order to fix this issue a small code change must be made to the boto library._
 

##Instructions

Once all tools are installed, run `aws configure` in a terminal. This will prompt for the user credentials of the required aws user. This user will also be the signatory of all Cloudtrail logs, so name it appropriately. 

###Command Line

`python Assembler.py [part ..]`

This will order the parts by dependencies, then prompt for any necessary information. Be aware that if you are making a part which other parts request in parameters, the created part will automatically be referenced instead.
Once all necessary information is provided, the script will generate a `.stack` file in the stacks folder. This stack contains all provided data in a format readable by Amazon CloudFormation. At this point, the data can be 
sent to be created, or saved for later. The stack file will be preserved in order to allow for change tracking and easier distribution of configurations.

###GUI

__Under Construction__

##Examples
The simplest example is of course a stack with one part. If I need just 1 VPC, I can run `python Assembler.py VPC`
Prompts:
`Stack Name: VPCStack
Describe this stack: Example
Parameters for VPC1
        VPCCidr :192.168.0.0
        VPCName :ExampleVPC
`
These parameters produce the following stack:
`{
  "Description": "Example Stack",
  "Parameters": {},
  "Mappings": {},
  "Conditions": {},
  "Resources": {
    "VPC1": {
      "Type": "AWS::EC2::VPC",
      "Properties": {
        "CidrBlock": "192.168.0.0/16",
        "Tags": [
          {
            "Key": "Name",
            "Value": "ExampleVPC"
          }
        ]
      }
    }
  },
  "Outputs": {
    "VPCID1": {
      "Description": "ID of created VPC",
      "Value": {
        "Ref": "VPC1"
      }
    }
  }
}
`
 
 