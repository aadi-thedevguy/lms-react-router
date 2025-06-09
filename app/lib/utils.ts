import { clsx, type ClassValue } from "clsx"
import { toast} from "sonner";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function actionToast({
  actionData
}:  & {
  actionData: { error: boolean; message: string }
}) {
  if (actionData.error) {
    return toast.error('Error', {
      description: actionData.message
    })
  }
  return toast.success('Success', {
    description: actionData.message
  })
}

/**
 * Combine multiple header objects into one (uses append so headers are not overridden)
 */
export function combineHeaders(
	...headers: Array<ResponseInit['headers'] | null | undefined>
) {
	const combined = new Headers()
	for (const header of headers) {
		if (!header) continue
		for (const [key, value] of new Headers(header).entries()) {
			combined.append(key, value)
		}
	}
	return combined
}
