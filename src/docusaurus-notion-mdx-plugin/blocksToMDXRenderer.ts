import {
    ParagraphBlockObjectResponse,
    Heading1BlockObjectResponse,
    Heading2BlockObjectResponse,
    Heading3BlockObjectResponse,
    BulletedListItemBlockObjectResponse,
    NumberedListItemBlockObjectResponse,
    ToDoBlockObjectResponse,
    QuoteBlockObjectResponse,
    CodeBlockObjectResponse,
    PartialBlockObjectResponse,
    BlockObjectResponse,
    RichTextItemResponse,
    ImageBlockObjectResponse
} from '@notionhq/client/build/src/api-endpoints'
import {fetchBlockChildren} from './notionClient.js';
import {saveImageToFile} from "./fileUtils";

export function renderParagraph(block: ParagraphBlockObjectResponse) {
    return renderUnderlyingFormatMDXList(block.paragraph.rich_text) + '\n\n';
}

export async function renderHeading1(block: Heading1BlockObjectResponse) {
    const headingText = block.heading_1.rich_text.map(t => t.plain_text).join("");
    let result = `# ${headingText}\n\n`;
    if (block.has_children) {
        const childrenBlock = await fetchBlockChildren({block_id: block.id});
        result += generateMDXContent(childrenBlock);
    }
    return result;
}

export function renderHeading2(block: Heading2BlockObjectResponse) {
    const headingText = block.heading_2.rich_text.map(t => t.plain_text).join("");
    return `## ${headingText}\n\n`;
}

export function renderHeading3(block: Heading3BlockObjectResponse) {
    const headingText = block.heading_3.rich_text.map(t => t.plain_text).join("");
    return `### ${headingText}\n\n`;
}

export async function renderBulletedListItem(block: BulletedListItemBlockObjectResponse, indentLevel = 0) {
    let listItemContent = renderUnderlyingFormatMDXList(block.bulleted_list_item.rich_text)

    const indent = '  '.repeat(indentLevel);  // 2 spaces per indent level
    listItemContent = indent + "- " + listItemContent + "\n"
    if (block.has_children) {
        const childrenBlock = await fetchBlockChildren({block_id: block.id});
        let childrenContent = await generateMDXContent(childrenBlock, indentLevel + 1);
        listItemContent += childrenContent;
    }
    return listItemContent;
}

export function renderNumberedListItem(block: NumberedListItemBlockObjectResponse) {
    let itemContent = block.numbered_list_item.rich_text.map(t => t.plain_text).join("")
    return "1. " + itemContent + "\n"
}

export function renderToDo(block: ToDoBlockObjectResponse) {
    return `- [${block.to_do.checked ? "x" : " "}] ${block.to_do.rich_text.map(t => t.plain_text).join("")}\n`
}

export function renderQuote(block: QuoteBlockObjectResponse) {
    return "> " + block.quote.rich_text.map(t => t.plain_text).join("") + "\n"
}

export function renderCode(block: CodeBlockObjectResponse) {
    let codeContent = "";
    const caption = block.code.caption;
    // Handles special MDX syntax
    if (caption && caption.length > 0 && caption[0].plain_text === '!mdx') {
        codeContent += block.code.rich_text.map(t => t.plain_text).join("\n")
        codeContent += "\n\n"
    } else {
        codeContent = "\n```"

        codeContent += block.code.language
        if (caption && caption.length > 0) {
            codeContent += " " + "title=\"" + caption[0].plain_text + "\"" + "\n"
        } else {
            codeContent += "\n"
        }
        codeContent += block.code.rich_text.map(t => t.plain_text).join("\n")
        codeContent += "\n```\n"
    }
    return codeContent
}

export async function renderImage(block: ImageBlockObjectResponse) {
    let imageContent = '';

    if (block.image.type === 'external') {
        imageContent += `![${block.image.caption.length > 0 ? block.image.caption[0].plain_text : block.id}](${block.image.external.url})`;
    } else {
        // Local image
        const imageFileName = `image_${block.id}.png`;

        // Save image file to /docs/img/
        await saveImageToFile('docs/assets/', imageFileName, block.image.file.url);

        imageContent += `![${block.image.caption}](../assets/${imageFileName})`;
    }

    return imageContent + '\n';
}

export function renderUnderlyingFormatMDXList(richTextList: Array<RichTextItemResponse>) {
    let mdx = '';

    for (let t of richTextList) {
        mdx += renderMDXContent(t) + " "
    }

    return mdx.trim();
}

export function renderMDXContent(richText: RichTextItemResponse) {
    let mdx = '';

    if (richText.annotations.bold) {
        mdx += '**';
    }
    if (richText.annotations.italic) {
        mdx += '*';
    }
    if (richText.annotations.underline) {
        mdx += '<u>';
    }
    if (richText.annotations.strikethrough) {
        mdx += '~~';
    }
    if (richText.annotations.code) {
        mdx += '`';
    }

    // renderHref
    if (richText.href) {
        if (richText.type === 'text') {
            mdx += `[${richText.plain_text}](${richText?.text?.link?.url})`
        }
    } else {
        mdx += richText.plain_text;
    }

    if (richText.annotations.bold) {
        mdx += '**';
    }
    if (richText.annotations.italic) {
        mdx += '*';
    }
    if (richText.annotations.underline) {
        mdx += '</u>';
    }
    if (richText.annotations.strikethrough) {
        mdx += '~~';
    }
    if (richText.annotations.code) {
        mdx += '`';
    }

    return mdx.trim();
}

export async function generateMDXContent(blocks: Array<PartialBlockObjectResponse | BlockObjectResponse>, indentLevel = 0) {
    // Implementation from previous examples
    let mdx = ""
    for (const block of blocks) {
        if ('type' in block) {
            if (block.type == "paragraph") {
                mdx += renderParagraph(block)
            } else if (block.type == "heading_1") {
                mdx += await renderHeading1(block)
            } else if (block.type == "heading_2") {
                mdx += renderHeading2(block)
            } else if (block.type == "heading_3") {
                mdx += renderHeading3(block)
            } else if (block.type == "bulleted_list_item") {
                mdx += await renderBulletedListItem(block, indentLevel)
            } else if (block.type == "numbered_list_item") {
                mdx += renderNumberedListItem(block)
            } else if (block.type == "to_do") {
                mdx += renderToDo(block)
            } else if (block.type == "quote") {
                mdx += renderQuote(block)
            } else if (block.type == "code") {
                mdx += renderCode(block)
            } else if (block.type == 'image') {
                mdx += await renderImage(block)
            } else {
                console.warn("Unknown block type: " + JSON.stringify(block, null, 2))
            }
        }
    }
    return mdx
}