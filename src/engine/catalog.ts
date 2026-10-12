import raw from '../data/catalog.json'

export interface CatalogSeries {
  name: string
  family: string
  positioning: string
  bypass: string
  motor_protection: boolean
  in_delta: boolean
  na_cert: boolean
  mv?: boolean
}

export interface CatalogModel {
  series: string
  code: string
  v_min: number
  v_max: number
  motor_kw?: number
  frame?: number
  rated_ambient_C?: number
  rated_starts_per_hour?: number
  bypass?: boolean
  ratings: Record<string, number | null>
}

export const catalog = raw as unknown as {
  series: Record<string, CatalogSeries>
  models: CatalogModel[]
}

export const modelsOf = (seriesId: string): CatalogModel[] =>
  catalog.models.filter((m) => m.series === seriesId)
