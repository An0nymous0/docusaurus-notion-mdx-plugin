import {generateMDXContent} from './blocksToMDXRenderer'
import type {LoadContext, Plugin} from '@docusaurus/types';
// @ts-ignore
import type {PluginOptions} from './options';

const fs = require("fs")
const path = require("path")
import {initializeClient, fetchBlockChildren, fetchDatabase} from './notionClient.js';
import {mkdirSyncRecursive} from "./fileUtils";
import {PageObjectResponse} from "@notionhq/client/build/src/api-endpoints";

export default function pluginDocusaurusNotionMDXPlugin(
    // @ts-ignore
    context: LoadContext,
    options: PluginOptions,
): Plugin {
    return {
        name: "docusaurus-notion-mdx-plugin",
        async loadContent() {
        },
        async contentLoaded({}) {
            initializeClient(options.notionAuth)
            // const notion = new Client({ auth: options.notionAuth })
            // Get pages from Notion
            const database = await fetchDatabase({
                database_id: options.databaseId,
                filter: {
                    and: [
                        {
                            property: "DN - Last edited time",
                            last_edited_time: {
                                // @ts-ignore
                                after: options.lastSyncTime
                            }
                        },
                        {
                            property: "Status",
                            status: {
                                // @ts-ignore
                                equals: "Published"
                            }
                        }
                    ]
                }
            })

            for (const page of database) {
                // Get page content from Notion REST API
                const pageId = page.id
                const blockContent = await fetchBlockChildren({
                    block_id: pageId,
                })
                if (page.object === "page") {
                    if ("properties" in page) {
                        const docsClassificationProperty = page.properties["DN - Docs classification"]
                        if (docsClassificationProperty && docsClassificationProperty.type === "select") {
                            const pageDocsPath = docsClassificationProperty.select?.name.toLowerCase()
                            const docsDir = path.join(getProjectRoot(), "docs", ...(pageDocsPath ? pageDocsPath.split("/") : [""]));
                            // const docsDir = path.join(getProjectRoot(), "docs", ...pageDocsPath?pageDocsPath.split("/"):"/")

                            mkdirSyncRecursive(docsDir);
                            const filename = pageId + ".mdx"
                            const fileContent = await generateMDXContent(blockContent)
                            // console.log(fileContent)
                            // Add a preface to Docs https://docusaurus.io/docs/markdown-features#front-matter
                            let frontMatterContent = getFrontMatter(page);
                            // console.log(docsDir)
                            fs.writeFileSync(
                                path.join(docsDir, filename),
                                frontMatterContent + fileContent
                            )
                        }
                    }
                }
                updatePluginLastSyncTime()
            }
            console.log("docusaurus-notion-mdx-plugin Generates count[" + database.length + "]==============")
        }
        /* other lifecycle API */
    }
}


// @ts-ignore
function getPageTitle(page:PageObjectResponse) {
    let title = '';
    let properties= page.properties['Name'];
    if(properties.type === 'title'){
        properties.title.forEach(titlePart => {
            title += titlePart.plain_text;
        });
    }
    return title.trim();
}

function getPageShortTitle(page:PageObjectResponse) {
    let title = '';
    let properties= page.properties["DN - Short title"];
    if(properties.type ==='rich_text'){
        properties.rich_text.forEach(titlePart => {
            title += titlePart.plain_text;
        });
    }
    return title.trim();
}

function updatePluginLastSyncTime() {
    // Gets the path to the configuration file
    const configPath = path.resolve(getProjectRoot(), 'docusaurus.config.js')

    // Read the configuration content
    let configCode = fs.readFileSync(configPath, 'utf8')

    // Update the lastSyncTime configuration
    configCode = configCode.replace(
        /lastSyncTime:"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/,
        `lastSyncTime:"${new Date().toISOString()}"`
    )

    // Writes to the configuration file
    fs.writeFileSync(configPath, configCode)
}

function getFrontMatter(page:PageObjectResponse) {
    // Handling Tags
    let tags:any[] = [];
    let tagsProp = page.properties["DN - Tags"]
    if(tagsProp.type==='multi_select'){
        tags = tagsProp.multi_select;
    }
    // @ts-ignore
    const tagNames = tags.map(t => `${t.name}`);
    // Output label
    const tagOutput = `[${tagNames.join(",")}]`;
    const shortTitle = getPageShortTitle(page)
    let frontMatter = '---\n';

    if (page.id) {
        frontMatter += `id: ${page.id}\n`;
    }

    if (getPageTitle(page)) {
        frontMatter += `title: ${getPageTitle(page)}\n`;
    }

    if (tagOutput) {
        frontMatter += `tags: ${tagOutput}\n`;
    }

    if (shortTitle) {
        frontMatter += `sidebar_label: '${shortTitle}'\n`;
    }

    frontMatter += '---\n';
    return frontMatter
}

function getProjectRoot() {
    return process.cwd();
}