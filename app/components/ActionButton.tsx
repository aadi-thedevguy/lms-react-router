import { type ComponentPropsWithRef, type ReactNode } from "react"
import { Form, useNavigation } from "react-router"
import { Button } from "./ui/button"
import { Loader2Icon } from "lucide-react"
import { cn } from "~/lib/utils"
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./ui/alert-dialog"

export function ActionButton({
  formAction,
  formMethod = "post",
  requireAreYouSure = false,
  formData,
  ...props
}: Omit<ComponentPropsWithRef<typeof Button>, "onClick" | "type"> & {
  formAction: string
  formMethod?: "post" | "put" | "patch" | "delete"
  requireAreYouSure?: boolean
  formData?: Record<string, string>
}) {
  const navigation = useNavigation()
  const isLoading = navigation.state === "submitting" && 
    navigation.formAction === formAction
    // navigation.formMethod.toLowerCase() === formMethod.toLowerCase()

  const formProps = {
    action: formAction,
    method: formMethod,
  }

  const FormContent = () => (
    <Form {...formProps}>
      {formData && 
        Object.entries(formData).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))
      }
      <Button type="submit" {...props} disabled={isLoading}>
        <LoadingTextSwap isLoading={isLoading}>
          {props.children}
        </LoadingTextSwap>
      </Button>
    </Form>
  )

  if (requireAreYouSure) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button {...props} type="button">
            {props.children}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <FormContent />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return <FormContent />
}

export function LoadingTextSwap({
  isLoading,
  children,
}: {
  isLoading: boolean
  children: ReactNode
}) {
  return (
    <div className="grid items-center justify-items-center">
      <div
        className={cn(
          "col-start-1 col-end-2 row-start-1 row-end-2",
          isLoading ? "invisible" : "visible"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "col-start-1 col-end-2 row-start-1 row-end-2 text-center",
          isLoading ? "visible" : "invisible"
        )}
      >
        <Loader2Icon className="animate-spin" />
      </div>
    </div>
  )
}
