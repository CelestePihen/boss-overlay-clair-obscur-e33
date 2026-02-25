export interface Boss {
  name: string
  killed: boolean
  encountered: boolean
  category?: string
  zone?: string
  originalName?: string
  needsInfo?: boolean // Flag pour indiquer qu'il faut remplir les infos
}
