import { pppCoupons } from "~/data/pppCoupons"

const COUNTRY_HEADER_KEY = "x-user-country"

export function setUserCountryHeader(
  headers: Headers,
  country: string | undefined
) {
  if (country == null) {
    headers.delete(COUNTRY_HEADER_KEY)
  } else {
    headers.set(COUNTRY_HEADER_KEY, country)
  }
}

export function getUserCountry(request: Request) {
  return request.headers.get(COUNTRY_HEADER_KEY)
}

export async function getUserCoupon(request: Request) {
  const country = getUserCountry(request)
  if (country == null) return

  const coupon = pppCoupons.find(coupon =>
    coupon.countryCodes.includes(country)
  )

  if (coupon == null) return

  return {
    couponId: coupon.couponId,
    discountPercentage: coupon.discountPercentage,
  }
}
