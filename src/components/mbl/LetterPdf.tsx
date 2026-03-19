import { Document, Page, Text, View, Image, Svg, Path, Rect, Circle, StyleSheet, Font } from '@react-pdf/renderer'
import type { MblAgent, MblProperty } from '@/types'

// Register Noto Sans — supports wide Unicode range
Font.register({
  family: 'Noto',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff', fontWeight: 'normal' },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff', fontWeight: 'bold' },
  ],
})

/** Strip emoji and other non-printable chars that crash react-pdf */
function clean(str: string): string {
  return str.replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27BF}|\u{FE00}-\u{FEFF}|\u{200D}|\u{20E3}|\u{E0020}-\u{E007F}]/gu, '').trim()
}

const s = StyleSheet.create({
  page: {
    padding: '1in',
    fontFamily: 'Noto',
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1a1a1a',
    backgroundColor: '#faf9f7',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    height: 44,
    maxWidth: 200,
    objectFit: 'contain' as const,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d2d2d',
  },
  body: {
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 8,
    fontSize: 11,
    lineHeight: 1.6,
  },
  bulletItem: {
    marginBottom: 4,
    fontSize: 11,
    lineHeight: 1.4,
    paddingLeft: 12,
  },
  bulletDot: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
  },
  sigBlock: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 32,
  },
  headshot: {
    width: 48,
    height: 48,
    borderRadius: 4,
    objectFit: 'cover' as const,
  },
  initialsBox: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#e5e2dd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  sigName: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  sigLicense: {
    fontSize: 8,
    fontWeight: 'normal',
    color: '#888',
  },
  sigDetail: {
    fontSize: 10,
    color: '#444',
  },
  ps: {
    marginTop: 20,
    fontSize: 9,
    lineHeight: 1.4,
    color: '#555',
  },
  psBold: {
    fontWeight: 'bold',
  },
  // Address list styles
  listPage: {
    padding: 36,
    fontFamily: 'Noto',
    fontSize: 8,
    color: '#1a1a1a',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 9,
    color: '#666',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 4,
    marginBottom: 6,
    fontWeight: 'bold',
    fontSize: 7,
    color: '#666',
  },
  tableRow: {
    flexDirection: 'row' as const,
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
    fontSize: 8,
  },
  colNum: { width: '4%' },
  colAddress: { width: '30%' },
  colCity: { width: '22%' },
  colBeds: { width: '6%' },
  colBaths: { width: '6%' },
  colSqft: { width: '10%' },
  colValue: { width: '12%' },
  colYears: { width: '10%' },
})

interface LetterDocProps {
  properties: MblProperty[]
  agent: MblAgent | null
  selectedSkillId: string | null
  logoDataUri?: string | null
}

export function LetterDocument({ properties, agent, selectedSkillId, logoDataUri }: LetterDocProps) {
  const agentName = agent?.name ?? ''
  const initials = agentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <Document>
      {properties.map((prop) => {
        const content = selectedSkillId && prop.personalized_content_by_skill?.[selectedSkillId]
          ? prop.personalized_content_by_skill[selectedSkillId]
          : prop.personalized_content as { body: string; ps: string } | null

        const body = content?.body ?? ''
        const ps = content?.ps ?? ''
        const paragraphs = body.split('\n').filter(Boolean)

        return (
          <Page key={prop.id} size="LETTER" style={s.page}>
            {/* Logo */}
            <View style={s.logoWrap}>
              {logoDataUri ? (
                <Image src={logoDataUri} style={s.logo} />
              ) : agent?.logo_url && !agent.logo_url.endsWith('.svg') ? (
                <Image src={agent.logo_url} style={s.logo} />
              ) : (
                <Text style={s.logoText}>{clean(agent?.brokerage || agentName)}</Text>
              )}
            </View>

            {/* Body paragraphs */}
            <View style={s.body}>
              {paragraphs.map((para, i) => {
                const isBullet = /^[•\-\*]\s/.test(para.trim())
                if (isBullet) {
                  return (
                    <View key={i} style={s.bulletItem}>
                      <Text style={s.bulletDot}>•</Text>
                      <Text>{clean(para.replace(/^[•\-\*]\s*/, ''))}</Text>
                    </View>
                  )
                }
                return <Text key={i} style={s.paragraph}>{clean(para)}</Text>
              })}
            </View>

            {/* Signature */}
            <View style={s.sigBlock}>
              {agent?.headshot_url && !agent.headshot_url.endsWith('.svg') ? (
                <Image src={agent.headshot_url} style={s.headshot} />
              ) : (
                <View style={s.initialsBox}>
                  <Text style={s.initialsText}>{initials}</Text>
                </View>
              )}
              <View>
                <Text style={s.sigName}>
                  {clean(agentName)}
                  {agent?.license_number ? (
                    <Text style={s.sigLicense}> ({agent.license_number})</Text>
                  ) : null}
                </Text>
                {agent?.brokerage ? <Text style={s.sigDetail}>{clean(agent.brokerage)}</Text> : null}
                <Text style={s.sigDetail}>{agent?.phone ?? ''}</Text>
                {agent?.email ? <Text style={s.sigDetail}>{agent.email}</Text> : null}
              </View>
            </View>

            {/* P.S. */}
            {ps ? (
              <Text style={s.ps}>
                <Text style={s.psBold}>p.s. </Text>
                {clean(ps)}
              </Text>
            ) : null}
          </Page>
        )
      })}
    </Document>
  )
}

interface AddressDocProps {
  properties: MblProperty[]
  buyerName: string
  area: string
}

export function AddressDocument({ properties, buyerName, area }: AddressDocProps) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={s.listPage}>
        <Text style={s.listTitle}>{buyerName} — Address List</Text>
        <Text style={s.listSubtitle}>{area} · {properties.length} properties</Text>

        {/* Header */}
        <View style={s.tableHeader}>
          <Text style={s.colNum}>#</Text>
          <Text style={s.colAddress}>Address</Text>
          <Text style={s.colCity}>City, State ZIP</Text>
          <Text style={s.colBeds}>Beds</Text>
          <Text style={s.colBaths}>Baths</Text>
          <Text style={s.colSqft}>Sqft</Text>
          <Text style={s.colValue}>Value</Text>
          <Text style={s.colYears}>Yrs Owned</Text>
        </View>

        {/* Rows */}
        {properties.map((prop, i) => (
          <View key={prop.id} style={s.tableRow} wrap={false}>
            <Text style={s.colNum}>{i + 1}</Text>
            <Text style={s.colAddress}>{prop.address_line1}</Text>
            <Text style={s.colCity}>{prop.city}, {prop.state} {prop.zip}</Text>
            <Text style={s.colBeds}>{prop.bedrooms ?? '—'}</Text>
            <Text style={s.colBaths}>{prop.bathrooms ?? '—'}</Text>
            <Text style={s.colSqft}>{prop.sqft ? prop.sqft.toLocaleString() : '—'}</Text>
            <Text style={s.colValue}>{prop.estimated_value ? `$${prop.estimated_value.toLocaleString()}` : '—'}</Text>
            <Text style={s.colYears}>{prop.years_owned ?? '—'}</Text>
          </View>
        ))}
      </Page>
    </Document>
  )
}
