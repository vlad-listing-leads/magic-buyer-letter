import { Document, Page, Text, View, Image, Svg, Path, Rect, Circle, StyleSheet, Font } from '@react-pdf/renderer'
import type { MblAgent, MblProperty } from '@/types'

// Register Noto Sans — for address list and sans-serif elements
Font.register({
  family: 'Noto',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff', fontWeight: 'normal' },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff', fontWeight: 'bold' },
  ],
})

// Register Libre Baskerville — editorial serif for letter body
Font.register({
  family: 'Baskerville',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff', fontWeight: 'normal' },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/libre-baskerville/files/libre-baskerville-latin-400-italic.woff', fontWeight: 'normal', fontStyle: 'italic' },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff', fontWeight: 'bold' },
  ],
})

/** Strip emoji and other non-printable chars that crash react-pdf */
function clean(str: string): string {
  return str.replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27BF}|\u{FE00}-\u{FEFF}|\u{200D}|\u{20E3}|\u{E0020}-\u{E007F}]/gu, '').trim()
}

const s = StyleSheet.create({
  // ── Letter page — editorial serif ──
  page: {
    padding: 18,
    fontFamily: 'Baskerville',
    fontSize: 11,
    lineHeight: 1.75,
    color: '#333',
    backgroundColor: '#fdfcfa',
  },
  insetBorder: {
    borderWidth: 0.5,
    borderColor: '#e2ded8',
    paddingHorizontal: 48,
    paddingBottom: 36,
    paddingTop: 0,
    flexGrow: 1,
  },
  logoWrap: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 4,
  },
  logo: {
    height: 36,
    maxWidth: 160,
    objectFit: 'contain' as const,
  },
  logoText: {
    fontSize: 11,
    fontFamily: 'Noto',
    color: '#555',
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
  },
  dividerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    marginBottom: 14,
  },
  dividerLine: {
    width: 18,
    height: 0.5,
    backgroundColor: '#c5bfb5',
  },
  dividerDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#c5bfb5',
  },
  body: {
    marginBottom: 8,
  },
  dropCap: {
    fontSize: 38,
    lineHeight: 0.85,
    fontWeight: 'bold',
    color: '#1a2744',
    fontFamily: 'Baskerville',
  },
  paragraph: {
    marginBottom: 10,
    fontSize: 11,
    lineHeight: 1.75,
  },
  bulletItem: {
    marginBottom: 5,
    fontSize: 10.5,
    lineHeight: 1.65,
    paddingLeft: 14,
    color: '#444',
  },
  bulletDot: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
  },
  warmRegards: {
    fontStyle: 'italic' as const,
    fontSize: 11,
    color: '#555',
    marginTop: 28,
    marginBottom: 14,
  },
  sigBlock: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start',
    gap: 12,
  },
  headshot: {
    width: 48,
    height: 48,
    borderRadius: 6,
    objectFit: 'cover' as const,
  },
  initialsBox: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#1a2744',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 14,
    fontFamily: 'Noto',
    color: '#e8dfd0',
    letterSpacing: 1,
  },
  sigName: {
    fontSize: 11,
    fontFamily: 'Noto',
    fontWeight: 'bold',
    color: '#1a2744',
  },
  sigLicense: {
    fontSize: 7.5,
    fontWeight: 'normal',
    color: '#aaa',
  },
  sigDetail: {
    fontSize: 9.5,
    fontFamily: 'Noto',
    color: '#777',
  },
  psWrap: {
    marginTop: 20,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#c5bfb5',
  },
  ps: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: '#777',
    fontStyle: 'italic' as const,
  },
  psLabel: {
    fontStyle: 'normal' as const,
    fontFamily: 'Noto',
    fontWeight: 'bold',
    fontSize: 7.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: '#999',
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
  colName: { width: '18%' },
  colAddress: { width: '24%' },
  colCity: { width: '20%' },
  colBeds: { width: '5%' },
  colBaths: { width: '5%' },
  colSqft: { width: '8%' },
  colValue: { width: '10%' },
  colYears: { width: '6%' },
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
            <View style={s.insetBorder}>
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

              {/* Ornamental divider */}
              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <View style={s.dividerDot} />
                <View style={s.dividerLine} />
              </View>

              {/* Body paragraphs with drop cap */}
              <View style={s.body}>
                {paragraphs.map((para, i) => {
                  const cleaned = clean(para)
                  const isBullet = /^[•\-\*]\s/.test(para.trim())
                  if (isBullet) {
                    return (
                      <View key={i} style={s.bulletItem}>
                        <Text style={s.bulletDot}>•</Text>
                        <Text>{clean(para.replace(/^[•\-\*]\s*/, ''))}</Text>
                      </View>
                    )
                  }
                  {/* Drop cap on first paragraph */}
                  if (i === 0 && cleaned.length > 1) {
                    return (
                      <Text key={i} style={s.paragraph}>
                        <Text style={s.dropCap}>{cleaned[0]}</Text>
                        {cleaned.slice(1)}
                      </Text>
                    )
                  }
                  return <Text key={i} style={s.paragraph}>{cleaned}</Text>
                })}
              </View>

              {/* Signature */}
              <Text style={s.warmRegards}>With warm regards,</Text>
              <View style={s.sigBlock}>
                {agent?.headshot_url && !agent.headshot_url.endsWith('.svg') ? (
                  <Image src={agent.headshot_url} style={s.headshot} />
                ) : (
                  <View style={s.initialsBox}>
                    <Text style={s.initialsText}>{initials}</Text>
                  </View>
                )}
                <View>
                  <Text style={s.sigName}>{clean(agentName)}</Text>
                  {agent?.brokerage ? <Text style={s.sigDetail}>{clean(agent.brokerage)}</Text> : null}
                  <Text style={s.sigDetail}>{agent?.phone ?? ''}</Text>
                  {agent?.email ? <Text style={s.sigDetail}>{agent.email}</Text> : null}
                  {agent?.license_number ? <Text style={{ ...s.sigDetail, fontSize: 7.5, color: '#aaa' }}>License #{agent.license_number}</Text> : null}
                </View>
              </View>

              {/* P.S. — pull-quote style with left border */}
              {ps ? (
                <View style={s.psWrap}>
                  <Text style={s.ps}>
                    <Text style={s.psLabel}>P.S.  </Text>
                    {clean(ps)}
                  </Text>
                </View>
              ) : null}
            </View>
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
          <Text style={s.colName}>Recipient</Text>
          <Text style={s.colAddress}>Address</Text>
          <Text style={s.colCity}>City, State ZIP</Text>
          <Text style={s.colBeds}>Beds</Text>
          <Text style={s.colBaths}>Baths</Text>
          <Text style={s.colSqft}>Sqft</Text>
          <Text style={s.colValue}>Value</Text>
          <Text style={s.colYears}>Yrs</Text>
        </View>

        {/* Rows */}
        {properties.map((prop, i) => {
          const name = `${prop.owner_first_name ?? ''} ${prop.owner_last_name ?? ''}`.trim() || 'Current Resident'
          return (
            <View key={prop.id} style={s.tableRow} wrap={false}>
              <Text style={s.colNum}>{i + 1}</Text>
              <Text style={s.colName}>{name}</Text>
              <Text style={s.colAddress}>{prop.address_line1}</Text>
              <Text style={s.colCity}>{prop.city}, {prop.state} {prop.zip}</Text>
              <Text style={s.colBeds}>{prop.bedrooms ?? '—'}</Text>
              <Text style={s.colBaths}>{prop.bathrooms ?? '—'}</Text>
              <Text style={s.colSqft}>{prop.sqft ? prop.sqft.toLocaleString() : '—'}</Text>
              <Text style={s.colValue}>{prop.estimated_value ? `$${prop.estimated_value.toLocaleString()}` : '—'}</Text>
              <Text style={s.colYears}>{prop.years_owned ?? '—'}</Text>
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
