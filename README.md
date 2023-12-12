> Currently in the testing version, only supports docs. Will support multiple docs and blogs in the future.

# docusaurus-notion-mdx-plugin

docusaurus-notion-mdx-plugin enables you to use Notion as the editor for [Docusaurus](https://docusaurus.io/). By using Notion instead of raw markdown files, you eliminate the need to teach non-developers how to make git commits and pull requests. This simplifies collaboration and editing between users with less technical proficiency. docusaurus-notion-mdx-plugin allows non-technical team members to contribute content in a more user-friendly manner without having to learn complex version control processes.

Example Site: https://sillsdev.github.io/docu-notion-sample-site/

# Instructions

## 1. In Notion, duplicate the docu-notion template

Go to [this template page](https://max-gao.notion.site/ed0b17d232e34a81adf72197f041108f?v=be37eec5fd044d11abd16cc1b1360af1&pvs=4). Duplicate it into your own workspace.
However, please note that you should not modify the fields of the database.

## 2. Create a Notion Integration

In order for docusaurus-notion-mdx-plugin to read your site via Notion's API, you need to create what Notion calls an "integration". Follow [these instructions](https://developers.notion.com/docs/getting-started) to make an integration and get your token. Remember to limit your integration to "READ" access.

> Please remember your Notion Integration key, as it will be used for configuring the Docusaurus plugin later.

## 3. Connect your Integration

Go to the page that will be the root of your site. This page should have, as direct children, your "Outline" (required) and "Database" (optional) pages. Follow [these instructions](https://developers.notion.com/docs/create-a-notion-integration#give-your-integration-page-permissions).

![1702293207751.jpg](public%2F1702293207751.jpg)

## 4. Set up your documentation site.

### Install the plug-in
```shell
npm i docusaurus-notion-mdx-plugin
```

## 5. Modify the **docusaurus.config.js** file to configure plugins.
```json
plugins: [
    .......,
    ['docusaurus-notion-mdx-plugin',
      {
        notionAuth: 'Your docusaurus-notion-mdx-plugin Notion Integration Key.',
        databaseId: 'Notion template page database ID',
        lastSyncTime:"2023-12-07T10:32:23.473Z"
      }
    ],
  ],
```
### How to obtain the database ID.
> First, determine the id of your root page by clicking "Share" and looking at the url it gives you. E.g.
https://www.notion.so/max-gao/ex0b17d232e34a81sdf72197c041108f
means that the id is "0456aa5842946PRETEND4f37c97a0e5".

### lastSyncTime Field Description
This field represents the data you want to synchronize from this day onwards. Each subsequent run of the project will automatically update it. The corresponding field in the database is the last modified time, so any updated articles will also be synchronized here.

## 5. Add your page under the database.

When adding a page under the template database you copied, please pay attention to the fields of the database. Below are the meanings and explanations of the fields.

- Name -> Docs title
- DN - Short title -> Corresponding to the sidebar_label in Docusaurus docs front matter.
- DN - Tags -> Corresponding to the tags in Docusaurus docs front matter.
- DN - Docs classification -> Corresponding directory structure under "docs".
- DN - Last edited time -> For synchronization

## 6. Run your docusaurus project

### pnpm
```shell
pnpm start
```

View the files generated in the `Docs` directory.

## 7. Commit

Every time you run the project, the page will be updated. If you are using a CI system (such as Github Actions) for deployment, you can exclude submitting the page file.


# Please begin to enjoy
