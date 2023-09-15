import assert from 'assert';
import { XmlParser, xmlText } from "../../src/dom";

describe('HTML', () => {
    it('Trivial', () => {
        const htmlString = '<!DOCTYPE html>' +
        `<html lang="en">
            <head>
                <!-- <meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content=""><meta name="author" content=""> -->
                <title>About - Simple Blog Template</title>
                <!-- Bootstrap Core CSS -->
                <link href="css/bootstrap.min.css" rel="stylesheet">
                <!-- Custom CSS -->
                <link href="css/simple-blog-template.css" rel="stylesheet">
                <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
                <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
                <!--[if lt IE 9]>
                <script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>
                <script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>
                <![endif]-->
            </head>
        </html>
        `;

        const xmlParser = new XmlParser();
        const parsedHtml = xmlParser.xmlParse(htmlString);
        const outHtmlString = xmlText(parsedHtml, {
            cData: false,
            selfClosingTags: false,
            escape: true
        });

        assert.ok(outHtmlString);
    });
});
