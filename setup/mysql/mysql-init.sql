--
-- Copyright 2015 CareerBuilder, LLC
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and limitations under the License.
--

CREATE SCHEMA IF NOT EXISTS `cloudseed`;

CREATE TABLE IF NOT EXISTS `cloudseed`.`users` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(256) DEFAULT NULL,
  `salt` varchar(128) DEFAULT NULL,
  `accesskey` char(20) DEFAULT NULL,
  `secretkey` char(40) DEFAULT NULL,
  `confirm` varchar(64) NOT NULL,
  `active` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `cloudseed`.`parts` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `Type` varchar(200) NOT NULL,
  `Description` varchar(200) DEFAULT NULL,
  `Part` longtext,
  `Subpart` tinyint(1) NOT NULL DEFAULT '0',
  `SubAssembly` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `Type_UNIQUE` (`Type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `cloudseed`.`stacks` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(200) DEFAULT NULL,
  `Template` longtext,
  `Region` varchar(45) DEFAULT NULL,
  `Ready` tinyint(1) NOT NULL DEFAULT '0',
  `Parts` longtext,
  `Variables` longtext,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `Name_UNIQUE` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
