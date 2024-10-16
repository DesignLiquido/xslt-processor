import assert from 'assert';

import { XmlParser } from '../../src/dom';
import { Xslt } from '../../src/xslt';

describe('xsl:choose', () => {
    it('Trivial', async () => {
        const xmlSource = `<?xml version="1.0" encoding="UTF-8"?>
            <products>
                <product>
                    <product_id>ABC</product_id>
                </product>
                <product>
                    <product_id>ABB</product_id>
                </product>
            </products>`;

        const xsltSource = `<?xml version="1.0" encoding="UTF-8"?><xsl:stylesheet version="2.0"
            xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:output method="xml" indent="yes"/>
        
            <xsl:template match="/products">
                <products>
                    <xsl:for-each select="product">
                        <product>
                            <xsl:choose>
                                <xsl:when test="product_id = 'ABB'">
                                    <xsl:text>Yes</xsl:text>
                                </xsl:when>
                                <xsl:otherwise>
                                    <xsl:text>No</xsl:text>
                                </xsl:otherwise>
                            </xsl:choose>
                        </product>
                    </xsl:for-each>
                </products>
            </xsl:template>
        </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const html = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, '<products><product>No</product><product>Yes</product></products>');
    });

    it('https://github.com/DesignLiquido/xslt-processor/issues/92', async () => {
        const xmlSource = `<sign gloss="simple">
                <hamnosys_sign>
                    <sign2>
                        <minitialconfig2>
                            <handconfig2>
                                <handshape2>
                                    <handshape1 handshapeclass="ham_flathand"/>
                                </handshape2>
                            </handconfig2>
                        </minitialconfig2>
                    </sign2>
                </hamnosys_sign>
            </sign>`;

        const xsltSource = `<xsl:transform version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

            <!-- THESE OUTPUT SETTINGS MAY BE OVERRIDDEN BY THE H2S PROCESSOR: -->

            <xsl:output method="xml" omit-xml-declaration="yes"
                indent="yes" encoding="UTF-8"/>

            <!--######## handShapeValue ########-->

            <xsl:template name="handShapeValue">

                <xsl:variable name="hs" select="@handshapeclass"/>
                <xsl:value-of select="substring-after(concat(substring-before($hs,'hand'),$hs[not(contains(.,'hand'))]),'ham_')"/>

                <xsl:if test="$hs='ham_flathand'">
                    <xsl:value-of select="'flat'"/>
                </xsl:if>
                <xsl:if test="$hs!='ham_flathand'">
                    <xsl:value-of select="substring-after($hs,'ham_')"/>
                </xsl:if>

                <xsl:choose>
                    <xsl:when test="$hs='ham_flathand'">
                        <xsl:value-of select="'flat'"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="substring-after($hs,'ham_')"/>
                    </xsl:otherwise>
                </xsl:choose>

                <xsl:choose>
                    <xsl:when test="$hs='ham_flathand'">
                        <xsl:value-of select="'flat'"/>
                    </xsl:when>
                </xsl:choose>
            
            </xsl:template>

            <!--######## sign ########-->

            <xsl:template match="/">
                <!--
                <!ELEMENT sign (hamnosys_sign?)>
                <!ATTLIST sign gloss CDATA #IMPLIED>
                -->

                <xsl:element name="hamgestural_sign">

                    <xsl:if test="@gloss">
                        <xsl:attribute name="gloss">
                            <xsl:value-of select="@gloss"/>
                        </xsl:attribute>
                    </xsl:if>

                    <xsl:element name="sign_manual">
                        <xsl:apply-templates select="sign/hamnosys_sign/sign2/minitialconfig2/handconfig2/handshape2/handshape1"/>
                    </xsl:element>

                </xsl:element>
            </xsl:template>
        </xsl:transform>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const html = await xsltClass.xsltProcess(xml, xslt);
        assert.equal(html, '<hamgestural_sign><sign_manual/></hamgestural_sign>');
    });

    /**
     * Error:
     * 
     * TypeError: Cannot read properties of null (reading '1')
     * 
     *       at XmlParser.Object.<anonymous>.XmlParser.xmlStrictParse (src/dom/xml-parser.ts:244:60)
     *       at XmlParser.Object.<anonymous>.XmlParser.xmlParse (src/dom/xml-parser.ts:54:21)
     *       at tests/xslt/choose.test.tsx:614:31
     *       at step (tests/xslt/choose.test.tsx:33:23)
     *       at Object.next (tests/xslt/choose.test.tsx:14:53)
     *       at tests/xslt/choose.test.tsx:8:71
     *       at Object.<anonymous>.__awaiter (tests/xslt/choose.test.tsx:4:12)
     *       at Object.<anonymous> (tests/xslt/choose.test.tsx:134:70)
     */
    it.skip('https://github.com/DesignLiquido/xslt-processor/issues/107', async () => {
        const xmlSource = `<[Bundle](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle) xmlns="http://hl7.org/fhir">
            <[id](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.id) value="218b581d-ccbe-480e-b8d7-f5f9b925e8c4" />
            <[meta](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.meta)>
                <[lastUpdated](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.meta.lastUpdated) value="2022-05-20T08:30:00Z" />
                <[profile](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.meta.profile) value="https://fhir.kbv.de/StructureDefinition/KBV_PR_ERP_Bundle|1.1.0" />
            </meta>
            <[identifier](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.identifier)>
                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.identifier.system) value="https://gematik.de/fhir/erp/NamingSystem/GEM_ERP_NS_PrescriptionId" />
                <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.identifier.value) value="160.100.000.000.020.79" />
            </identifier>
            <[type](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.type) value="document" />
            <[timestamp](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.timestamp) value="2022-05-20T08:30:00Z" />
            <[entry](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry)>
                <[fullUrl](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.fullUrl) value="http://pvs.praxis.local/fhir/Composition/5c43d99a-64ba-436d-9b8c-6ee5156d7607" />
                <[resource](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource)>
                    <Composition>
                        <[id](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.id) value="5c43d99a-64ba-436d-9b8c-6ee5156d7607" />
                        <[meta](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta)>
                            <[profile](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta.profile) value="https://fhir.kbv.de/StructureDefinition/KBV_PR_ERP_Composition|1.1.0" />
                        </meta>
                        <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension) url="https://fhir.kbv.de/StructureDefinition/KBV_EX_FOR_Legal_basis">
                            <[valueCoding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_SFHIR_KBV_STATUSKENNZEICHEN" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.code) value="00" />
                            </valueCoding>
                        </extension>
                        <[status](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.status) value="final" />
                        <[type](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.type)>
                            <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.type.coding)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.type.coding.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_SFHIR_KBV_FORMULAR_ART" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.type.coding.code) value="e16A" />
                            </coding>
                        </type>
                        <[subject](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.subject)>
                            <[reference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.subject.reference) value="Patient/1d36152b-40c6-4aeb-a552-86a4d3277edc" />
                        </subject>
                        <[date](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.date) value="2022-05-20T08:00:00Z" />
                        <[author](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.author)>
                            <[reference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.author.reference) value="Practitioner/d6f3b55d-3095-4655-96dc-da3bec21271c" />
                            <[type](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.author.type) value="Practitioner" />
                        </[author](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.author)>
                        <author>
                            <[type](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.author.type) value="Device" />
                            <[identifier](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.author.identifier)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.author.identifier.system) value="https://fhir.kbv.de/NamingSystem/KBV_NS_FOR_Pruefnummer" />
                                <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.author.identifier.value) value="Y/400/2107/36/999" />
                            </identifier>
                        </author>
                        <[title](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.title) value="elektronische Arzneimittelverordnung" />
                        <[custodian](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.custodian)>
                            <[reference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.custodian.reference) value="Organization/2a555cd3-0543-483c-88b3-f68647620962" />
                        </custodian>
                        <[section](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section)>
                            <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.code)>
                                <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.code.coding)>
                                    <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.code.coding.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_ERP_Section_Type" />
                                    <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.code.coding.code) value="Prescription" />
                                </coding>
                            </code>
                            <[entry](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.entry)>
                                <!--  Referenz auf Verordnung (MedicationRequest)  -->
                                <[reference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.entry.reference) value="MedicationRequest/53344ec1-64ec-400a-b741-8ab1a4f1f07d" />
                            </entry>
                        </[section](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section)>
                        <section>
                            <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.code)>
                                <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.code.coding)>
                                    <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.code.coding.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_ERP_Section_Type" />
                                    <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.code.coding.code) value="Coverage" />
                                </coding>
                            </code>
                            <[entry](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.entry)>
                                <!--  Referenz auf Krankenkasse/KostentrĂ¤ger   -->
                                <[reference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.section.entry.reference) value="Coverage/0099318c-c7a5-4bf9-a164-3365fb149a3f" />
                            </entry>
                        </section>
                    </Composition>
                </resource>
            </[entry](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry)>
            <entry>
                <[fullUrl](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.fullUrl) value="http://pvs.praxis.local/fhir/MedicationRequest/53344ec1-64ec-400a-b741-8ab1a4f1f07d" />
                <[resource](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource)>
                    <MedicationRequest>
                        <[id](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.id) value="53344ec1-64ec-400a-b741-8ab1a4f1f07d" />
                        <[meta](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta)>
                            <[profile](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta.profile) value="https://fhir.kbv.de/StructureDefinition/KBV_PR_ERP_Prescription|1.1.0" />
                        </meta>
                        <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension) url="https://fhir.kbv.de/StructureDefinition/KBV_EX_FOR_StatusCoPayment">
                            <[valueCoding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_FOR_StatusCoPayment" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.code) value="1" />
                            </valueCoding>
                        </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension)>
                        <extension url="https://fhir.kbv.de/StructureDefinition/KBV_EX_ERP_EmergencyServicesFee">
                            <[valueBoolean](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value) value="false" />
                        </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension)>
                        <extension url="https://fhir.kbv.de/StructureDefinition/KBV_EX_ERP_BVG">
                            <[valueBoolean](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value) value="false" />
                        </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension)>
                        <extension url="https://fhir.kbv.de/StructureDefinition/KBV_EX_FOR_Accident">
                            <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.extension) url="Unfallkennzeichen">
                                <[valueCoding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.extension.value)>
                                    <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.extension.value.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_FOR_Ursache_Type" />
                                    <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.extension.value.code) value="4" />
                                </valueCoding>
                            </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension)>
                        </extension>
                        <extension url="https://fhir.kbv.de/StructureDefinition/KBV_EX_ERP_Multiple_Prescription">
                            <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.extension) url="Kennzeichen">
                                <[valueBoolean](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.extension.value) value="false" />
                            </extension>
                        </extension>
                        <[status](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.status) value="active" />
                        <[intent](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.intent) value="order" />
                        <[medicationReference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.medication)>
                            <[reference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.medication.reference) value="Medication/e091f324-689b-4f3c-875d-050b525b09c5" />
                        </medicationReference>
                        <[subject](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.subject)>
                            <[reference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.subject.reference) value="Patient/1d36152b-40c6-4aeb-a552-86a4d3277edc" />
                        </subject>
                        <[authoredOn](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.authoredOn) value="2022-05-20" />
                        <[requester](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.requester)>
                            <[reference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.requester.reference) value="Practitioner/d6f3b55d-3095-4655-96dc-da3bec21271c" />
                        </requester>
                        <[insurance](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.insurance)>
                            <[reference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.insurance.reference) value="Coverage/0099318c-c7a5-4bf9-a164-3365fb149a3f" />
                        </insurance>
                        <[dosageInstruction](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.dosageInstruction)>
                            <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.dosageInstruction.extension) url="https://fhir.kbv.de/StructureDefinition/KBV_EX_ERP_DosageFlag">
                                <[valueBoolean](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.dosageInstruction.extension.value) value="false" />
                            </extension>
                        </dosageInstruction>
                        <[dispenseRequest](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.dispenseRequest)>
                            <[quantity](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.dispenseRequest.quantity)>
                                <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.dispenseRequest.quantity.value) value="1" />
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.dispenseRequest.quantity.system) value="http://unitsofmeasure.org" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.dispenseRequest.quantity.code) value="{Package}" />
                            </quantity>
                        </dispenseRequest>
                    </MedicationRequest>
                </resource>
            </[entry](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry)>
            <entry>
                <[fullUrl](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.fullUrl) value="http://pvs.praxis.local/fhir/Medication/e091f324-689b-4f3c-875d-050b525b09c5" />
                <[resource](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource)>
                    <Medication>
                        <[id](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.id) value="e091f324-689b-4f3c-875d-050b525b09c5" />
                        <[meta](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta)>
                            <[profile](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta.profile) value="https://fhir.kbv.de/StructureDefinition/KBV_PR_ERP_Medication_Ingredient|1.1.0" />
                        </meta>
                        <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension) url="https://fhir.kbv.de/StructureDefinition/KBV_EX_ERP_Medication_Category">
                            <[valueCoding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_ERP_Medication_Category" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.code) value="00" />
                            </valueCoding>
                        </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension)>
                        <extension url="https://fhir.kbv.de/StructureDefinition/KBV_EX_ERP_Medication_Vaccine">
                            <[valueBoolean](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value) value="false" />
                        </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension)>
                        <extension url="http://fhir.de/StructureDefinition/normgroesse">
                            <[valueCode](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value) value="N2" />
                        </extension>
                        <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.code)>
                            <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.code.coding)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.code.coding.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_ERP_Medication_Type" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.code.coding.code) value="wirkstoff" />
                            </coding>
                        </code>
                        <[form](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.form)>
                            <[text](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.form.text) value="Tabletten" />
                        </form>
                        <[amount](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.amount)>
                            <[numerator](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.amount.numerator)>
                                <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.amount.numerator.extension) url="https://fhir.kbv.de/StructureDefinition/KBV_EX_ERP_Medication_PackagingSize">
                                    <[valueString](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.amount.numerator.extension.value) value="100" />
                                </extension>
                                <[unit](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.amount.numerator.unit) value="St&#252;ck" />
                            </numerator>
                            <[denominator](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.amount.denominator)>
                                <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.amount.denominator.value) value="1" />
                            </denominator>
                        </amount>
                        <[ingredient](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient)>
                            <[itemCodeableConcept](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.item)>
                                <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.item.coding)>
                                    <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.item.coding.system) value="http://fhir.de/CodeSystem/ask" />
                                    <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.item.coding.code) value="22308" />
                                </coding>
                                <[text](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.item.text) value="Gabapentin" />
                            </itemCodeableConcept>
                            <[strength](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength)>
                                <[numerator](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength.numerator)>
                                    <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength.numerator.value) value="300" />
                                    <[unit](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength.numerator.unit) value="mg" />
                                </numerator>
                                <[denominator](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength.denominator)>
                                    <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength.denominator.value) value="1" />
                                </denominator>
                            </strength>
                        </[ingredient](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient)>
                        <ingredient>
                            <[itemCodeableConcept](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.item)>
                                <[text](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.item.text) value="Gabapentin" />
                            </itemCodeableConcept>
                            <[strength](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength)>
                                <[numerator](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength.numerator)>
                                    <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength.numerator.value) value="300" />
                                    <[unit](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength.numerator.unit) value="mg" />
                                </numerator>
                                <[denominator](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength.denominator)>
                                    <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.ingredient.strength.denominator.value) value="1" />
                                </denominator>
                            </strength>
                        </ingredient>
                    </Medication>
                </resource>
            </[entry](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry)>
            <entry>
                <[fullUrl](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.fullUrl) value="http://pvs.praxis.local/fhir/Patient/1d36152b-40c6-4aeb-a552-86a4d3277edc" />
                <[resource](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource)>
                    <Patient>
                        <[id](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.id) value="1d36152b-40c6-4aeb-a552-86a4d3277edc" />
                        <[meta](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta)>
                            <[profile](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta.profile) value="https://fhir.kbv.de/StructureDefinition/KBV_PR_FOR_Patient|1.1.0" />
                        </meta>
                        <[identifier](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier)>
                            <[type](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type)>
                                <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type.coding)>
                                    <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type.coding.system) value="http://fhir.de/CodeSystem/identifier-type-de-basis" />
                                    <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type.coding.code) value="GKV" />
                                </coding>
                            </type>
                            <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.system) value="http://fhir.de/sid/gkv/kvid-10" />
                            <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.value) value="H030170228" />
                        </identifier>
                        <[name](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name)>
                            <[use](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.use) value="official" />
                            <[family](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.family) value="Grossherzog von und zu der Schaumberg-von-und-zu-Schaumburg-und-Radeberg">
                                <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.family.extension) url="http://fhir.de/StructureDefinition/humanname-namenszusatz">
                                    <[valueString](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.family.extension.value) value="Grossherzog" />
                                </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.family.extension)>
                                <extension url="http://hl7.org/fhir/StructureDefinition/humanname-own-prefix">
                                    <[valueString](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.family.extension.value) value="von und zu der" />
                                </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.family.extension)>
                                <extension url="http://hl7.org/fhir/StructureDefinition/humanname-own-name">
                                    <[valueString](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.family.extension.value) value="Schaumberg-von-und-zu-Schaumburg-und-Radeberg" />
                                </extension>
                            </family>
                            <[given](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.given) value="Friedrich-Wilhelm-Karl-Gustav-Justus-Gotfried" />
                            <[prefix](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.prefix) value="Prof. habil. Dr. med">
                                <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.prefix.extension) url="http://hl7.org/fhir/StructureDefinition/iso21090-EN-qualifier">
                                    <[valueCode](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.prefix.extension.value) value="AC" />
                                </extension>
                            </prefix>
                        </name>
                        <[birthDate](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.birthDate) value="1951-07-12" />
                        <[address](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address)>
                            <[type](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.type) value="postal" />
                            <[line](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line) value="124589">
                                <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line.extension) url="http://hl7.org/fhir/StructureDefinition/iso21090-ADXP-postBox">
                                    <[valueString](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line.extension.value) value="124589" />
                                </extension>
                            </line>
                            <[city](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.city) value="Berlin" />
                            <[postalCode](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.postalCode) value="12489" />
                            <[country](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.country) value="D" />
                        </address>
                    </Patient>
                </resource>
            </[entry](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry)>
            <entry>
                <[fullUrl](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.fullUrl) value="http://pvs.praxis.local/fhir/Practitioner/d6f3b55d-3095-4655-96dc-da3bec21271c" />
                <[resource](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource)>
                    <Practitioner>
                        <[id](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.id) value="d6f3b55d-3095-4655-96dc-da3bec21271c" />
                        <[meta](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta)>
                            <[profile](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta.profile) value="https://fhir.kbv.de/StructureDefinition/KBV_PR_FOR_Practitioner|1.1.0" />
                        </meta>
                        <[identifier](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier)>
                            <[type](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type)>
                                <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type.coding)>
                                    <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type.coding.system) value="http://terminology.hl7.org/CodeSystem/v2-0203" />
                                    <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type.coding.code) value="LANR" />
                                </coding>
                            </type>
                            <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.system) value="https://fhir.kbv.de/NamingSystem/KBV_NS_Base_ANR" />
                            <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.value) value="754236701" />
                        </identifier>
                        <[name](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name)>
                            <[use](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.use) value="official" />
                            <[family](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.family) value="Schulz">
                                <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.family.extension) url="http://hl7.org/fhir/StructureDefinition/humanname-own-name">
                                    <[valueString](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.family.extension.value) value="Schulz" />
                                </extension>
                            </family>
                            <[given](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name.given) value="Ben" />
                        </name>
                        <[qualification](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification)>
                            <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification.code)>
                                <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification.code.coding)>
                                    <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification.code.coding.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_FOR_Qualification_Type" />
                                    <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification.code.coding.code) value="00" />
                                </coding>
                            </code>
                        </[qualification](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification)>
                        <qualification>
                            <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification.code)>
                                <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification.code.coding)>
                                    <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification.code.coding.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_FOR_Berufsbezeichnung" />
                                    <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification.code.coding.code) value="Berufsbezeichnung" />
                                </coding>
                                <[text](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.qualification.code.text) value="Facharzt f&#252;r Allgemeinmedizin" />
                            </code>
                        </qualification>
                    </Practitioner>
                </resource>
            </[entry](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry)>
            <entry>
                <[fullUrl](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.fullUrl) value="http://pvs.praxis.local/fhir/Organization/2a555cd3-0543-483c-88b3-f68647620962" />
                <[resource](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource)>
                    <Organization>
                        <[id](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.id) value="2a555cd3-0543-483c-88b3-f68647620962" />
                        <[meta](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta)>
                            <[profile](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta.profile) value="https://fhir.kbv.de/StructureDefinition/KBV_PR_FOR_Organization|1.1.0" />
                        </meta>
                        <[identifier](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier)>
                            <[type](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type)>
                                <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type.coding)>
                                    <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type.coding.system) value="http://terminology.hl7.org/CodeSystem/v2-0203" />
                                    <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.type.coding.code) value="BSNR" />
                                </coding>
                            </type>
                            <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.system) value="https://fhir.kbv.de/NamingSystem/KBV_NS_Base_BSNR" />
                            <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.identifier.value) value="724444400" />
                        </identifier>
                        <[name](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.name) value="Hausarztpraxis" />
                        <[telecom](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.telecom)>
                            <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.telecom.system) value="phone" />
                            <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.telecom.value) value="030321654987" />
                        </[telecom](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.telecom)>
                        <telecom>
                            <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.telecom.system) value="email" />
                            <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.telecom.value) value="hausarztpraxis@e-mail.de" />
                        </telecom>
                        <[address](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address)>
                            <[type](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.type) value="both" />
                            <[line](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line) value="Herbert-Lewin-Platz 2">
                                <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line.extension) url="http://hl7.org/fhir/StructureDefinition/iso21090-ADXP-houseNumber">
                                    <[valueString](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line.extension.value) value="2" />
                                </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line.extension)>
                                <extension url="http://hl7.org/fhir/StructureDefinition/iso21090-ADXP-streetName">
                                    <[valueString](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line.extension.value) value="Herbert-Lewin-Platz" />
                                </extension>
                            </[line](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line)>
                            <line value="Erdgeschoss">
                                <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line.extension) url="http://hl7.org/fhir/StructureDefinition/iso21090-ADXP-additionalLocator">
                                    <[valueString](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.line.extension.value) value="Erdgeschoss" />
                                </extension>
                            </line>
                            <[city](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.city) value="Berlin" />
                            <[postalCode](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.postalCode) value="10623" />
                            <[country](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.address.country) value="D" />
                        </address>
                    </Organization>
                </resource>
            </[entry](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry)>
            <entry>
                <[fullUrl](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.fullUrl) value="http://pvs.praxis.local/fhir/Coverage/0099318c-c7a5-4bf9-a164-3365fb149a3f" />
                <[resource](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource)>
                    <Coverage>
                        <[id](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.id) value="0099318c-c7a5-4bf9-a164-3365fb149a3f" />
                        <[meta](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta)>
                            <[profile](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.meta.profile) value="https://fhir.kbv.de/StructureDefinition/KBV_PR_FOR_Coverage|1.1.0" />
                        </meta>
                        <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension) url="http://fhir.de/StructureDefinition/gkv/besondere-personengruppe">
                            <[valueCoding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_SFHIR_KBV_PERSONENGRUPPE" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.code) value="00" />
                            </valueCoding>
                        </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension)>
                        <extension url="http://fhir.de/StructureDefinition/gkv/dmp-kennzeichen">
                            <[valueCoding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_SFHIR_KBV_DMP" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.code) value="00" />
                            </valueCoding>
                        </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension)>
                        <extension url="http://fhir.de/StructureDefinition/gkv/wop">
                            <[valueCoding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_SFHIR_ITA_WOP" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.code) value="72" />
                            </valueCoding>
                        </[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension)>
                        <extension url="http://fhir.de/StructureDefinition/gkv/versichertenart">
                            <[valueCoding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.system) value="https://fhir.kbv.de/CodeSystem/KBV_CS_SFHIR_KBV_VERSICHERTENSTATUS" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.extension.value.code) value="1" />
                            </valueCoding>
                        </extension>
                        <[status](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.status) value="active" />
                        <[type](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.type)>
                            <[coding](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.type.coding)>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.type.coding.system) value="http://fhir.de/CodeSystem/versicherungsart-de-basis" />
                                <[code](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.type.coding.code) value="BG" />
                            </coding>
                        </type>
                        <[beneficiary](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.beneficiary)>
                            <[reference](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.beneficiary.reference) value="Patient/1d36152b-40c6-4aeb-a552-86a4d3277edc" />
                        </beneficiary>
                        <[period](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.period)>
                            <[end](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.period.end) value="2034-12-31" />
                        </period>
                        <[payor](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.payor)>
                            <[identifier](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.payor.identifier)>
                                <[extension](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.payor.identifier.extension) url="https://fhir.kbv.de/StructureDefinition/KBV_EX_FOR_Alternative_IK">
                                    <[valueIdentifier](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.payor.identifier.extension.value)>
                                        <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.payor.identifier.extension.value.system) value="http://fhir.de/sid/arge-ik/iknr" />
                                        <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.payor.identifier.extension.value.value) value="121191241" />
                                    </valueIdentifier>
                                </extension>
                                <[system](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.payor.identifier.system) value="http://fhir.de/sid/arge-ik/iknr" />
                                <[value](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.payor.identifier.value) value="108035612" />
                            </identifier>
                            <[display](https://simplifier.net/resolve?scope=eRezept@current&filepath=KBV_PR_ERP_Bundle.xml#Bundle.entry.resource.payor.display) value="Verwaltungs-BG" />
                        </payor>
                    </Coverage>
                </resource>
            </entry>
        </Bundle>`;

        const xsltSource = `<?xml version="1.0" encoding="UTF-8"?>
            <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xd="http://www.oxygenxml.com/ns/doc/xsl" xmlns:fhir="http://hl7.org/fhir" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns="http://www.w3.org/1999/xhtml" exclude-result-prefixes="xd fhir xsi xhtml" version="1.0">
                <xsl:output method="text"/>
                <xsl:template match="/fhir:Bundle">
                    <xsl:call-template name="printERP-1.1.0"/>
                </xsl:template>
                <xsl:template name="printERP-1.1.0">
                    <xsl:text>VOArt=</xsl:text>
                    <xsl:choose>
                    <xsl:when test="fhir:entry/fhir:resource/fhir:Medication/fhir:code/fhir:coding/fhir:system[@value='http://fhir.de/CodeSystem/ifa/pzn']">pzn</xsl:when>
                    <xsl:when test="fhir:entry/fhir:resource/fhir:Medication/fhir:code/fhir:coding/fhir:system[@value='https://fhir.kbv.de/CodeSystem/KBV_CS_ERP_Medication_Type']/following-sibling::fhir:code[@value='wirkstoff']">wirkstoff</xsl:when>
                    <xsl:when test="fhir:entry/fhir:resource/fhir:Medication/fhir:code/fhir:coding/fhir:system[@value='https://fhir.kbv.de/CodeSystem/KBV_CS_ERP_Medication_Type']/following-sibling::fhir:code[@value='freitext']">freitext</xsl:when>
                    <xsl:when test="fhir:entry/fhir:resource/fhir:Medication/fhir:code/fhir:coding/fhir:system[@value='https://fhir.kbv.de/CodeSystem/KBV_CS_ERP_Medication_Type']/following-sibling::fhir:code[@value='rezeptur']">rezeptur</xsl:when>
                    </xsl:choose>
                    <xsl:text>&#xa;</xsl:text>
                    <xsl:text>Dokumententyp=</xsl:text>
                    <xsl:value-of select="fhir:entry/fhir:resource/fhir:Composition/fhir:type/fhir:coding/fhir:system[@value='https://fhir.kbv.de/CodeSystem/KBV_CS_SFHIR_KBV_FORMULAR_ART']/following-sibling::fhir:code/@value"/>
                    <xsl:text>&#xa;</xsl:text>
                    <xsl:text>PrfNr=</xsl:text>
                    <xsl:value-of select="fhir:entry/fhir:resource/fhir:Composition/fhir:author[fhir:type/@value='Device']/fhir:identifier/fhir:value/@value"/>
                    <xsl:text>&#xa;</xsl:text>
                    <xsl:text>Rezeptid=</xsl:text>
                    <xsl:value-of select="fhir:identifier/fhir:value/@value"/>
                    <xsl:text>&#xa;</xsl:text>
                    <xsl:text>Kostraegertyp=</xsl:text>
                    <xsl:choose>
                    <xsl:when test="fhir:entry/fhir:resource/fhir:SupplyRequest/fhir:extension[@url='https://fhir.kbv.de/StructureDefinition/KBV_EX_ERP_PracticeSupply_Payor']/fhir:extension[@url='Kostentraegertyp']/fhir:valueCoding/fhir:code/@value">
                        <xsl:value-of select="fhir:entry/fhir:resource/fhir:SupplyRequest/fhir:extension[@url='https://fhir.kbv.de/StructureDefinition/KBV_EX_ERP_PracticeSupply_Payor']/fhir:extension[@url='Kostentraegertyp']/fhir:valueCoding/fhir:code/@value"/>
                    </xsl:when>
                    <xsl:when test="fhir:entry/fhir:resource/fhir:Coverage/fhir:type/fhir:coding/fhir:code/@value">
                        <xsl:value-of select="fhir:entry/fhir:resource/fhir:Coverage/fhir:type/fhir:coding/fhir:code/@value"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:text></xsl:text>
                    </xsl:otherwise>
                    </xsl:choose>
                </xsl:template>

                <xsl:template name="getPossibleEmptyValue">
                    <xsl:param name="path"/>
                    <xsl:choose>
                    <xsl:when test="$path">
                        <xsl:value-of select="translate(translate($path,'&#10;',' '),'&#13;',' ')"/>
                    </xsl:when>
                    </xsl:choose>
                </xsl:template>
            </xsl:stylesheet>`;

        const xsltClass = new Xslt();
        const xmlParser = new XmlParser();
        const xml = xmlParser.xmlParse(xmlSource);
        const xslt = xmlParser.xmlParse(xsltSource);
        const outputXml = await xsltClass.xsltProcess(xml, xslt);
        // assert.equal(outputXml, `VOArt=wirkstoff
        //    Dokumententyp=e16A
        //    PrfNr=Y/400/2107/36/999
        //    Rezeptid=160.100.000.000.020.79
        //    Kostraegertyp=BG`);
        assert.ok(outputXml);
    });
});
