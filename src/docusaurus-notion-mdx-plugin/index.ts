import type {LoadContext, Plugin} from '@docusaurus/types';
// @ts-ignore
import type {PluginOptions, Options} from './options';
import {Client} from "@notionhq/client";
const fs = require("fs")
const path = require("path")

export default function pluginDocusaurusNotionMDXPlugin(
    // @ts-ignore
    context: LoadContext,
    options: PluginOptions,
): Plugin {
    return {
        name: "docusaurus-notion-mdx-plugin",
        async loadContent() {},
        async contentLoaded({ content, actions }) {
            console.log(options.notionAuth)
            const notion = new Client({ auth: options.notionAuth })
            // Get pages from Notion
            const response = await notion.databases.query({
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

            // Iterate over pages
            for (const page of response.results as any) {
                // Get page content from Notion REST API
                const pageId = page.id
                const blockContent = await notion.blocks.children.list({
                    block_id: pageId
                })
                const pageDocsPath = page.properties["DN - Docs classification"]?.select?.name
                console.log("projectroot:",getProjectRoot())
                const docsDir = path.join(getProjectRoot(), "docs", ...pageDocsPath?pageDocsPath.split("/"):"/")

                mkdirSyncRecursive(docsDir);
                // @ts-ignore
                const pageTitle = getPageTitle(page)
                const filename = pageId + ".mdx"
                const fileContent = generateMDXContent(blockContent)
                // Add a preface to Docs https://docusaurus.io/docs/markdown-features#front-matter
                let frontMatterContent = getFrontMatter(page);

                fs.writeFileSync(
                    path.join(docsDir, filename),
                    frontMatterContent+fileContent
                )
                updatePluginLastSyncTime(content, actions)
            }
            console.log("docusaurus-notion-mdx-plugin Generates count["+response.results.length+"]==============")
        }
        /* other lifecycle API */
    }
}


// @ts-ignore
function getPageTitle(page) {
    let title = '';
    // @ts-ignore
    page.properties.Name.title.forEach(titlePart => {
        title += titlePart.plain_text;
    });
    return title.trim();
}

// @ts-ignore
function getPageShortTitle(page) {
    let title = '';
    // @ts-ignore
    page.properties["DN - Short title"].rich_text.forEach(titlePart => {
        title += titlePart.plain_text;
    });
    return title.trim();
}

// @ts-ignore
function generateMDXContent(blocks) {
    // Implementation from previous examples
    let mdx = ""
    // @ts-ignore
    blocks.results.forEach(block => {
        if (block.type == "paragraph") {
            // @ts-ignore
            mdx += block.paragraph.rich_text.map(t=> t.plain_text).join("") + "\n\n"
        } else if (block.type == "heading_1") {
            const headingText = block.heading_1.rich_text[0].text.content
            mdx += "# " + headingText + "\n\n"
        } else if (block.type == "heading_2") {
            // @ts-ignore
            mdx += "## " + block.heading_2.rich_text.map(t => t.plain_text).join("") + "\n\n"
        } else if (block.type == "heading_3") {
            // @ts-ignore
            mdx += "### " + block.heading_3.rich_text.map(t => t.plain_text).join("") + "\n\n"
        } else if (block.type == "bulleted_list_item") {
            let listItemContent = ""
            // @ts-ignore
            block.bulleted_list_item.rich_text.forEach(rt => {
                if (rt.text.link) {
                    listItemContent += `[${rt.plain_text}](${rt.text.link.url})`
                } else {
                    listItemContent += rt.plain_text
                }
                listItemContent += " "
            })
            mdx += "- " + listItemContent + "\n"
        } else if (block.type == "numbered_list_item") {
            // @ts-ignore
            mdx += "1. " + block.numbered_list_item.rich_text.map(t => t.plain_text).join("") + "\n"
        } else if (block.type == "to_do") {
            // @ts-ignore
            mdx += `- [${block.to_do.checked ? "x" : " "}] ${block.to_do.rich_text.map(t => t.plain_text).join("")}\n`
        } else if (block.type == "quote") {
            // @ts-ignore
            mdx += "> " + block.quote.rich_text.map(t => t.plain_text).join("") + "\n"
        } else if (block.type == "code") {
            console.log(block.code.language)
            // @ts-ignore
            mdx += "\n```"+block.code.language+"\n" + block.code.rich_text.map(t => t.plain_text).join("\n") + "\n```\n"
        }
    })
    return mdx
}

// @ts-ignore
function updatePluginLastSyncTime(content, actions) {
    // Gets the path to the configuration file
    const configPath = path.resolve(getProjectRoot(), 'docusaurus.config.js')

    // Read the configuration content
    let configCode = fs.readFileSync(configPath, 'utf8')

    // Update the lastSyncTime configuration
    configCode = configCode.replace(
        /lastSyncTime:"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}"/,
        `lastSyncTime:"${new Date().toISOString()}"`
    )

    // Writes to the configuration file
    fs.writeFileSync(configPath, configCode)
}

// @ts-ignore
function mkdirSyncRecursive(filename) {
    const parts = filename.split(path.sep);
    for(let i = 1; i <= parts.length; i++) {
        if(parts[i - 1] === '') continue
        const segment = parts.slice(0, i).join(path.sep);
        if (!fs.existsSync(segment)) {
            fs.mkdirSync(segment);
        }
    }
}

// @ts-ignore
function getFrontMatter(page){
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
