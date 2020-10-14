# Desktop Avatar Plugins

Plugins for the Salesbox Desktop Avatar

![icon](./plugin.png)

This repository contains the plugins that perform actions for the desktop avatar.

## The Problem

The Salesbox Desktop Avatar is a client desktop application which is installed in a user’s machine. Because it performs task on behalf of the user that involve working with websites and webpages that often change the logic needs to be updated quite often. However, it is hard to coordinate multiple installations continually being updated.

## The Solution - Plugins

To solve this issue the Desktop Avatar holds a lot of it’s web page logic in plugin files from this repository. When the client application starts, it downloads the latest versions and hence can benefit from the latest changes without the user needing to worry about downloading/updating their own install.