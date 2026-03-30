# RealEstateAPI (REAPI) v2 Reference

Base URL: `https://api.realestateapi.com`
Auth: `x-api-key` header (required), `x-user-id` header (optional)

## Endpoints We Use

### POST /v2/PropertySearch

#### Pagination & Control
| Param | Type | Description |
|-------|------|-------------|
| `size` | number | Results per page, max 250 |
| `resultIndex` | number | Starting index, 0-based |
| `count` | boolean | Return only count, no data |
| `ids_only` | boolean | Return only IDs (up to 10K) |
| `summary` | boolean | Include summary statistics |

#### Location
| Param | Type | Description |
|-------|------|-------------|
| `address` | string | Full address |
| `city` | string | City name |
| `state` | string | 2-char state code |
| `county` | string | County name |
| `zip` | string/array | 5-digit ZIP or array of ZIPs |
| `neighborhood_id` | number | Neighborhood ID |
| `neighborhood_name` | string | Neighborhood name |
| `latitude` | number | Lat for radius search |
| `longitude` | number | Lon for radius search |
| `radius` | number | Radius in miles (0.01–1000) |
| `polygon` | array | Array of `{lat, lon}` points |
| `census_tract` | string | Census tract |

#### Property Characteristics
| Param | Type | Values/Description |
|-------|------|-------------|
| `property_type` | string | **`SFR`, `MFR`, `CONDO`, `MOBILE`, `LAND`, `OTHER`** |
| `property_use_code` | number/array | Property use code(s) |
| `beds_min` / `beds_max` | number | Bedrooms (0–99) |
| `baths_min` / `baths_max` | number | Bathrooms (0–99) |
| `rooms_min` / `rooms_max` | number | Total rooms |
| `stories_min` / `stories_max` | number | Stories |
| `units_min` / `units_max` | number | Units (multi-family) |
| `year_built_min` / `year_built_max` | number | Year built |
| `building_size_min` / `building_size_max` | number | Building sqft |
| `living_square_feet_min` / `living_square_feet_max` | number | Living sqft |
| `lot_size_min` / `lot_size_max` | number | Lot sqft |
| `construction` | string | Construction type |
| `zoning_code` | string | Zoning |
| `building_condition` | string | `POOR`, `FAIR`, `AVERAGE`, `GOOD`, `EXCELLENT`, `UNSOUND` |

#### Features (all boolean)
`air_conditioning_available`, `attic`, `basement`, `carport`, `deck`, `feature_balcony`, `garage`, `hoa`, `patio`, `pool`, `rv_parking`, `fire_sprinklers`

#### Value & Assessment
| Param | Type | Description |
|-------|------|-------------|
| `value_min` / `value_max` | number | Estimated property value |
| `assessed_value_min` / `assessed_value_max` | number | Assessed value |
| `assessed_land_value_min` / `assessed_land_value_max` | number | Land assessment |

#### Equity & Financial
| Param | Type | Description |
|-------|------|-------------|
| `equity_percent_min` / `equity_percent_max` | number | Equity % (0–100) |
| `estimated_equity_min` / `estimated_equity_max` | number | Dollar equity |
| `free_clear` | boolean | No mortgage |
| `high_equity` | boolean | High equity flag |
| `negative_equity` | boolean | Underwater |
| `ltv_min` / `ltv_max` | number | Loan-to-value |

#### Ownership
| Param | Type | Description |
|-------|------|-------------|
| `owner_occupied` | boolean | Owner lives there |
| `absentee_owner` | boolean | Absentee owner |
| `in_state_owner` | boolean | Owner in same state |
| `out_of_state_owner` | boolean | Owner out of state |
| `corporate_owned` | boolean | Owned by company |
| `trust_owned` | boolean | Owned by trust |
| `years_owned` | number | Exact years owned |
| `years_owned_min` / `years_owned_max` | number | Years owned range |
| `years_owned_operator` | string | `lt`, `lte`, `gt`, `gte` |
| `cash_buyer` | boolean | Bought with cash |
| `investor_buyer` | boolean | Investor buyer |
| `inherited` | boolean | Inherited property |
| `death` | boolean | Death transfer |

#### Portfolio
| Param | Type | Description |
|-------|------|-------------|
| `properties_owned_min` / `properties_owned_max` | number | Total owned |
| `portfolio_value_min` / `portfolio_value_max` | number | Portfolio value |
| `portfolio_equity_min` / `portfolio_equity_max` | number | Portfolio equity |

#### Sale History
| Param | Type | Description |
|-------|------|-------------|
| `last_sale_date_min` / `last_sale_date_max` | string | Last sale date range |
| `last_sale_price_min` / `last_sale_price_max` | number | Last sale price |
| `last_sale_arms_length` | boolean | Arms-length transaction |

#### Mortgage
| Param | Type | Description |
|-------|------|-------------|
| `mortgage_min` / `mortgage_max` | number | Mortgage balance |
| `open_mortgages_min` / `open_mortgages_max` | number | Open mortgage count |
| `adjustable_rate` | boolean | ARM mortgage |
| `assumable` | boolean | Assumable loan |
| `loan_type_code_first` | string | `ARM`, `CON`, `FHA`, `VA`, `USDA`, `COM`, `BAL`, etc. |
| `private_lender` | boolean | Private lender |

#### Distressed / Foreclosure
| Param | Type | Description |
|-------|------|-------------|
| `foreclosure` | boolean | In foreclosure |
| `pre_foreclosure` | boolean | Pre-foreclosure |
| `notice_type` | string | `NOL`, `NOD`, `FOR`, `NTS`, `REO` |
| `auction` | boolean | At auction |
| `reo` | boolean | Bank-owned |
| `tax_lien` | boolean | Tax lien |
| `vacant` | boolean | Vacant property |
| `judgment` | boolean | Has judgment |

#### MLS
| Param | Type | Description |
|-------|------|-------------|
| `mls_active` | boolean | Active listing |
| `mls_sold` | boolean | Sold listing |
| `mls_pending` | boolean | Pending sale |
| `mls_listing_price_min` / `mls_listing_price_max` | number | Listing price |
| `mls_days_on_market_min` / `mls_days_on_market_max` | number | Days on market |
| `for_sale` | boolean | Currently for sale |
| `price_reduced` | boolean | Price was reduced |

#### Multi-Family
| Param | Type | Description |
|-------|------|-------------|
| `mfh_2to4` | boolean | 2–4 unit |
| `mfh_5plus` | boolean | 5+ unit |

---

### PropertySearch Response Fields

Each property in the `data` array:

**Core:**
`id`, `propertyId`, `bedrooms` (int), `bathrooms` (number), `stories`, `unitsCount`, `roomsCount`, `yearBuilt` (int), `squareFeet` (int), `lotSquareFeet` (int), `propertyType` (string), `propertyUse`, `propertyUseCode` (int), `landUse`, `apn`

**Values:**
`estimatedValue` (int), `assessedValue`, `assessedLandValue`, `assessedImprovementValue`, `estimatedEquity`, `equityPercent`, `rentAmount`, `pricePerSquareFoot`, `medianIncome`, `suggestedRent`

**Sale:**
`lastSaleDate`, `lastSaleAmount` (int), `lastSaleArmsLength` (bool), `latestArmsLengthSaleDate`, `latestArmsLengthSaleAmount`, `recordingDate`, `documentType`

**Owner:**
`owner1FirstName`, `owner1LastName`, `owner2FirstName`, `owner2LastName`, `companyName`, `yearsOwned` (int), `absenteeType`

**Location:**
`latitude`, `longitude`, `neighborhood` (string)
`address`: `{zip, city, county, fips, state, street, address}`
`mailAddress`: `{zip, city, county, state, street, address}`

**Flags (boolean):**
`vacant`, `absenteeOwner`, `corporateOwned`, `ownerOccupied`, `freeClear`, `highEquity`, `negativeEquity`, `foreclosure`, `preForeclosure`, `auction`, `reo`, `taxLien`, `judgment`, `death`, `inherited`, `cashBuyer`, `investorBuyer`, `privateLender`, `adjustableRate`, `assumable`, `floodZone`, `hoa`, `pool`, `garage`, `basement`, `mlsActive`, `mlsSold`, `mlsPending`, `forSale`

**MLS:**
`mlsListingPrice`, `mlsStatus`, `mlsType`, `mlsListingDate`, `mlsDaysOnMarket`, `mlsSoldPrice`

**Mortgage:**
`openMortgageBalance`, `lastMortgage1Amount`, `loanTypeCode`, `maturityDateFirst`, `lenderName`

**Portfolio:**
`totalPropertiesOwned`, `totalPortfolioValue`, `totalPortfolioEquity`, `totalPortfolioMortgageBalance`

**Pagination (top-level):**
`resultCount` (total matches), `resultIndex` (last index returned), `recordCount` (records in this page)

---

### POST /v2/SkipTrace

#### Request
| Param | Type | Description |
|-------|------|-------------|
| `first_name` | string | Person first name |
| `last_name` | string | Person last name |
| `address` | string | Street address |
| `city` | string | City |
| `state` | string | 2-char state |
| `zip` | string | 5-digit ZIP |

#### Response
```
{
  persons: [{
    firstName, lastName, fullName,
    phones: [{ number, type }] | null,
    emails: [{ email }] | null,
    address: { address }
  }]
}
```

---

## Endpoints We Might Use

### POST /v2/PropertyDetail
Full property details by `id` or `address`. Returns rich nested data: `propertyInfo`, `ownerInfo`, `lotInfo`, `taxInfo`, `mortgageHistory`, `saleHistory`, `mlsHistory`, `schools`, `demographics`, `neighborhood`, `linkedProperties`, `foreclosureInfo`.

### POST /v3/PropertyComps
Comparable sales with control over radius, days back, and boost factors for matching criteria.

### POST /v2/AutoComplete
Address/city/ZIP autocomplete. `search` (min 2 chars) + `search_types`: `A` (address), `C` (city), `Z` (zip), `N` (neighborhood).

### POST /v2/PropertyAvm
Automated valuation for a single property by `id` or `address`.

### POST /v2/MLSSearch
Full MLS listing search with status filters, agent/office, date ranges, polygon search.

### POST /v2/AddressVerification
Bulk verify up to 100 addresses.

### POST /v2/PropGPT
Natural language property search (beta). Takes `query` string.

### POST /v2/SkipTraceBatch / SkipTraceBatchAwait
Batch skip trace up to 1000 addresses (async or sync).

### POST /v2/CorporateSkip
Company lookup by `company_name`, `city`, `state`.

### GET /v2/key/info
Check API key scopes, rate limits, usage.

---

## Our Current Parameter Mapping

In `src/lib/services/reapi.ts` → `buildReapiParams()`:

| Our criteria field | REAPI param |
|---|---|
| `city` | `city` |
| `state` | `state` |
| `zip` | `zip` |
| `beds_min` | `beds_min` |
| `baths_min` | `baths_min` |
| `price_min` | `value_min` |
| `price_max` | `value_max` |
| `sqft_min` | `building_size_min` |
| `sqft_max` | `building_size_max` |
| `years_owned_min` | `years_owned` + `years_owned_operator: 'gte'` |
| `lot_sqft_min` | `lot_size_min` |
| `lot_sqft_max` | `lot_size_max` |
| `property_type` | `property_type` |

## Docs Links

- API Reference: https://developer.realestateapi.com/reference/welcome-to-realestateapi
- Property Search: https://developer.realestateapi.com/reference/property-search-api
- Property Search Field Guide: https://developer.realestateapi.com/reference/property-search-field-guide
- Skip Trace: https://developer.realestateapi.com/reference/skip-trace-api
- Swagger: https://staging.realestateapi.com/swagger
