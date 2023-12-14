import {generateMDXContent} from './blocksToMDXRenderer'
import type {LoadContext, Plugin} from '@docusaurus/types';
// @ts-ignore
import type {PluginOptions, Options} from './options';

const fs = require("fs")
const path = require("path")
import {initializeClient, fetchBlockChildren, fetchDatabase} from './notionClient.js';

export default function pluginDocusaurusNotionMDXPlugin(
    // @ts-ignore
    context: LoadContext,
    options: PluginOptions,
): Plugin {
    return {
        name: "docusaurus-notion-mdx-plugin",
        async loadContent() {
        },
        //@ts-ignore
        async contentLoaded({content, actions}) {
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
                            // const pageTitle = getPageTitle(page)
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
                updatePluginLastSyncTime(content, actions)
            }
            console.log("docusaurus-notion-mdx-plugin Generates count[" + database.length + "]==============")
        }
        /* other lifecycle API */
    }
}


// @ts-ignore
function getPageTitle(page) {
    let title = '';
    //@ts-ignore
    page.properties.Name.title.forEach(titlePart => {
        title += titlePart.plain_text;
    });
    return title.trim();
}

//@ts-ignore
function getPageShortTitle(page) {
    let title = '';
    //@ts-ignore
    page.properties["DN - Short title"].rich_text.forEach(titlePart => {
        title += titlePart.plain_text;
    });
    return title.trim();
}

//@ts-ignore
function updatePluginLastSyncTime(content, actions) {
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

//@ts-ignore
function mkdirSyncRecursive(filename) {
    const parts = filename.split(path.sep);
    for (let i = 1; i <= parts.length; i++) {
        if (parts[i - 1] === '') continue
        const segment = parts.slice(0, i).join(path.sep);
        if (!fs.existsSync(segment)) {
            fs.mkdirSync(segment);
        }
    }
}

//@ts-ignore
function getFrontMatter(page) {
    // Handling Tags
    const tags = page.properties["DN - Tags"].multi_select;
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