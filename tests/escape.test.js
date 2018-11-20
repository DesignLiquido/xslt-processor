import assert from 'assert';
import { xmlParse } from '../src/dom'
import { xmlText } from '../src/util'


describe('escape', () => {

	it('accepts already escaped ampersand', () => {
		const xmlString = '<root>Fish&amp;pie</root>';

		const outXmlString = xmlText(xmlParse(xmlString))

		assert.equal(
			outXmlString,
			xmlString
		);
	})

	it('escapes non-escaped ampersand', () => {
		const xmlString = '<root>Fish&pie</root>';

		const outXmlString = xmlText(xmlParse(xmlString))

		assert.equal(
			outXmlString,
			'<root>Fish&amp;pie</root>'
		);
	})

	it('accepts non-escaped ">" between elements', () => {
		const xmlString = '<root>Fish>pie</root>';

		const outXmlString = xmlText(xmlParse(xmlString))

		assert.equal(
			outXmlString,
			'<root>Fish&gt;pie</root>'
		);
	})

	it('accepts non-escaped "\'" between elements', () => {
		const xmlString = '<root>Fish\'pie</root>';

		const outXmlString = xmlText(xmlParse(xmlString))

		assert.equal(
			outXmlString,
			'<root>Fish\'pie</root>'
		);
	})

	it('accepts non-escaped \'"\' between elements', () => {
		const xmlString = '<root>Fish"pie</root>';

		const outXmlString = xmlText(xmlParse(xmlString))

		assert.equal(
			outXmlString,
			'<root>Fish"pie</root>'
		);
	})

	it('accepts non-escaped ">" in attributes', () => {
		const xmlString = '<root dish="eat>hunger">Fish</root>';

		const outXmlString = xmlText(xmlParse(xmlString))

		assert.equal(
			outXmlString,
			'<root dish="eat&gt;hunger">Fish</root>'
		);
	})

	it('accepts non-escaped "\'" in attributes', () => {
		const xmlString = '<root dish="eat\'hunger">Fish</root>';

		const outXmlString = xmlText(xmlParse(xmlString))

		assert.equal(
			outXmlString,
			'<root dish="eat\'hunger">Fish</root>'
		);
	})

	it('accepts non-escaped \'"\' in attributes', () => {
		const xmlString = "<root dish='eat\"hunger'>Fish</root>";
		const outXmlString = xmlText(xmlParse(xmlString))

		assert.equal(
			outXmlString,
			'<root dish="eat&quot;hunger">Fish</root>'
		);
	})


})
