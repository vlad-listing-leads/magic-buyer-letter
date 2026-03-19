# Former Hardcoded Letter Skill

This documents the letter writing approach that was previously hardcoded in the application before the Skills system was implemented. Use this as a reference for creating skills in the admin panel.

## What Was Hardcoded

The app used to have three hardcoded "template styles" (warm, direct, luxury) with fixed Claude prompts and a rigid letter structure.

### Letter Structure (Removed)

The letter was split into hardcoded sections that Claude had to fill:
- `opening`: 2-3 sentences mentioning the property address and neighborhood
- `body_1`: "We've looked at everything currently on the market. Nothing has been the right fit."
- `body_2`: "I promised them I'd do everything in my power to help them find a new home. That's why I'm writing to you."
- `bullet_intro`: "Here's what's important to know about [buyer name]:"
- `bullet_1`, `bullet_2`, `bullet_3`: Buyer selling points (from chip selections)
- `body_3`: "I want to be upfront: there are no guarantees here."
- `body_4`: "But if the right offer could change your plans, a short conversation is probably worth your time."
- `phone_line`: "My personal cell is [phone]."
- `closing`: "I look forward to hearing from you," / "Warm regards,"
- `ps`: "If you'd also like to know what your home is realistically worth in today's market, I'm happy to put together a complimentary home value report — no cost, no obligation."

### Hardcoded Claude Instructions (Removed)

```
You are a real estate letter writer. [tone instruction]

Write a buyer letter template. Use these EXACT variables:
- {{property_address}}, {{neighborhood}}, {{buyer_name}}
- {{bullet_1}}, {{bullet_2}}, {{bullet_3}}
- {{agent_name}}, {{agent_phone}}

Do NOT use owner names. Address the homeowner generically.

Respond with ONLY a JSON object with these keys:
- "opening": 2-3 sentences. Mention {{property_address}} and {{neighborhood}}.
- "body": 2-3 sentences explaining why the agent is writing.
- "closing": 1-2 sentences with call-to-action mentioning {{agent_phone}}.
- "ps": Optional P.S. line.

Do NOT include bullet points — the app adds those separately.
Do NOT include greetings like "Dear".
Keep it concise — under 300 words.
```

### Three Tone Presets (Now Skills)

**Warm & Personal:**
"Write in a warm, personal, conversational tone. Be genuine and relatable. Show deep respect for the homeowner and their home."

**Straight to the Point:**
"Write in a professional, direct, and concise tone. Focus on the business opportunity. Be respectful but efficient with words."

**Luxury:**
"Write in a refined, sophisticated tone. Use elevated language appropriate for high-value properties and discerning owners."

## Current System (Skills)

Skills are now admin-configurable at `/admin/skills`. Each skill's `prompt_instructions` is the ONLY creative direction Claude receives. The system prompt contains:
- The skill instructions (first, unframed)
- Available placeholders list
- JSON response format (`body` + `ps`)

Claude writes the ENTIRE letter body. The app only adds the agent logo (top) and signature block (bottom). No hardcoded structure, no forced bullet format, no sentence count limits.

## Example Skill Prompts

### Traditional Real Estate Letter
```
Write a professional real estate buyer letter. Address the homeowner generically (we don't have their name).

Structure:
1. Opening that mentions their property at {{property_address}} in {{neighborhood}}
2. Explain that your client {{buyer_name}} is actively looking in the area
3. Include these buyer details naturally: {{bullet_1}}, {{bullet_2}}, {{bullet_3}}
4. Closing with a call to action — mention {{agent_phone}}

Keep it under 250 words. Warm but professional tone.
```

### Poem Style
```
Write the entire letter as a free verse poem about finding a new home. Weave in {{property_address}}, {{neighborhood}}, and {{buyer_name}} naturally. The poem should evoke emotion about new beginnings and the meaning of home. Include {{bullet_1}}, {{bullet_2}}, {{bullet_3}} as poetic themes, not bullet points. End with {{agent_phone}} worked into a final stanza.
```

### Gen Z / Casual
```
Write a super casual, Gen Z style letter. Use modern slang naturally. Be genuine and enthusiastic but not cringe. Mention {{property_address}} and how {{buyer_name}} is obsessed with {{neighborhood}}. Work in {{bullet_1}}, {{bullet_2}}, {{bullet_3}} casually. Drop {{agent_phone}} at the end. Keep it real, no corporate vibes.
```
