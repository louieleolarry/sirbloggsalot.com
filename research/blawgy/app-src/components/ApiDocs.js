import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ApiDocs = () => {
  const domain = 'example.com';

  const markdownContent = `# Blawgy API Documentation

This document outlines the available API endpoints for the Blawgy service.

## Public Endpoints

### GET /blog-posts

Retrieves blog posts for a specific site.

**Parameters:**
- \`site\` (required): The domain name of the site to fetch blog posts for (e.g., "${domain}")

**Example Request:**
\`\`\`bash
curl -X GET 'https://app.blawgy.com/blog-posts?site=${domain}'
\`\`\`

**Response Format:**
\`\`\`json
[
  {
    "id": "string",
    "title": "string",
    "keywords": ["string"],
    "resources": [
      {
        "title": "string",
        "description": "string",
        "url": "string",
        "Features": ["string"],
        "Tech": "string" | ["string"]
      }
    ],
    "published": boolean,
    "publishDate": "ISO date string",
    "blogContent": "HTML string",
    "blogTitle": "string",
    "imageDescription": "string",
    "imageUrl": "string",
    "lastUpdated": "ISO date string",
    "metaDescription": "string",
    "metaKeywords": "string",
    "slug": "string"
  }
]
\`\`\`

**Example Response Fields:**
- \`id\`: Unique identifier for the blog post
- \`title\`: Title of the blog post
- \`keywords\`: Array of keywords associated with the post
- \`resources\`: Array of related resources
  - \`title\`: Resource title
  - \`description\`: Resource description
  - \`url\`: Resource URL
  - \`Features\`: Array of features
  - \`Tech\`: Technology stack (string or array of strings)
- \`published\`: Boolean indicating if the post is published
- \`publishDate\`: Publication date in ISO format
- \`blogContent\`: Full blog content in HTML format
- \`blogTitle\`: Display title for the blog
- \`imageDescription\`: Description of the blog's featured image
- \`imageUrl\`: URL of the blog's featured image
- \`lastUpdated\`: Last modification date in ISO format
- \`metaDescription\`: SEO meta description
- \`metaKeywords\`: SEO meta keywords
- \`slug\`: URL-friendly slug for the blog post

## Protected Endpoints

Protected endpoints require authentication. Authentication details will be provided separately.

## Error Handling

The API returns standard HTTP status codes:

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Error responses will include a message describing the error.

## Rate Limiting

Rate limiting details will be provided separately.

## Sitemap and Robots.txt

### Sitemap

For Next.js applications, create a \`pages/sitemap.xml.js\` file with the following structure:

\`\`\`javascript
const EXTERNAL_DATA_URL = 'https://app.blawgy.com/blog-posts';

function generateSiteMap(posts) {
  return \`<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>\${YOUR_DOMAIN}</loc>
     </url>
     \${posts
       .map(({ slug }) => {
         return \`
       <url>
           <loc>\${\`\${YOUR_DOMAIN}/\${slug}\`}</loc>
       </url>
     \`;
       })
       .join('')}
   </urlset>
 \`;\
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }) {
  const request = await fetch(\`\${EXTERNAL_DATA_URL}?site=\${YOUR_DOMAIN}\`);
  const posts = await request.json();

  const sitemap = generateSiteMap(posts);

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default SiteMap;
\`\`\`

### Robots.txt

Create a \`public/robots.txt\` file with the following content:

\`\`\`txt
User-agent: *
Allow: /

Sitemap: \${YOUR_DOMAIN}/sitemap.xml
\`\`\`

Replace \`\${YOUR_DOMAIN}\` with your actual domain name (e.g., https://${domain}).`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <ReactMarkdown
            children={markdownContent}
            components={{
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    children={String(children).replace(/\n$/, '')}
                    style={atomDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
            className="prose prose-slate max-w-none prose-pre:p-0 prose-headings:text-left prose-p:text-left prose-ul:text-left prose-ol:text-left"
          />
        </div>
      </div>
    </div>
  );
};

export default ApiDocs; 