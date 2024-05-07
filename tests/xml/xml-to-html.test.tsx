import assert from 'assert';
import { XmlParser } from "../../src/dom";
import { Xslt } from '../../src/xslt';

describe('XML to HTML', () => {
    it('Issue 74', async () => {
        const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
        <problem/>`;

        const xsltString = `<?xml version="1.0" encoding="utf-8"?>
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
          <xsl:template match="/problem">
            <div>
              <div>
                <table>
                  <tr>
                    <th>A</th>
                    <th>B</th>
                    <th>C</th>
                  </tr>
                  <tr>
                    <td>AA</td>
                    <td>BB</td>
                    <td>CC</td>
                  </tr>
                </table>
              </div>
            </div>
            <div>
              <div>should be below table rite??!</div>
            </div>
          </xsl:template>
        </xsl:stylesheet>`;

        const expectedOutHtml = `<div><div><table><tr><th>A</th><th>B</th><th>C</th></tr><tr><td>AA</td><td>BB</td><td>CC</td></tr></table></div></div><div><div>should be below table rite??!</div></div>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlString);
        const xslt = xmlParser.xmlParse(xsltString);
        const outXmlString = await xsltClass.xsltProcess(
          xml,
          xslt
        );

        // console.log(outXmlString);
        assert.equal(outXmlString, expectedOutHtml);
    });
});
