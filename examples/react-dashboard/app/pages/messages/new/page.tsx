'use client';

import React from 'react';
import { useNavigate, useBlocker } from '@cookbook/router-react';

import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MessageFormData {
  name: string;
  email: string;
  message: string;
}

function NewMessage() {
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState<MessageFormData>({
    name: '',
    email: '',
    message: '',
  });

  useBlocker({
    when: Boolean(formData.name || formData.email || formData.message),
    message:
      'Your message has not been sent. Leave this page and discard your draft?',
  });

  const handleOnClose = React.useCallback(() => {
    navigate.back();
  }, [navigate]);

  const handleSubmit = React.useCallback(
    (event: React.SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!formData.name || !formData.email || !formData.message) {
        return;
      }

      setFormData({
        name: '',
        email: '',
        message: '',
      });

      handleOnClose();
    },
    [handleOnClose, formData]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="message-name">Name</Label>
        <Input
          id="message-name"
          value={formData.name}
          onChange={(event) =>
            setFormData((currentFormData) => ({
              ...currentFormData,
              name: event.target.value,
            }))
          }
          placeholder="Jane Doe"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="message-email">Email</Label>
        <Input
          id="message-email"
          type="email"
          value={formData.email}
          onChange={(event) =>
            setFormData((currentFormData) => ({
              ...currentFormData,
              email: event.target.value,
            }))
          }
          placeholder="jane@example.com"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="message-body">Message</Label>
        <Textarea
          id="message-body"
          value={formData.message}
          onChange={(event) =>
            setFormData((currentFormData) => ({
              ...currentFormData,
              message: event.target.value,
            }))
          }
          placeholder="Write your message..."
          rows={5}
        />
      </div>
    </form>
  );
}

export function NewMessageLayoutHeader() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>New Message</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function NewMessageModalPage() {
  const navigate = useNavigate();

  const handleOnClose = React.useCallback(() => {
    navigate.back();
  }, [navigate]);

  return (
    <Dialog onOpenChange={handleOnClose} open>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send a message</DialogTitle>
          <DialogDescription>
            Send a new message by entering the recipient, subject, and message
            details.
          </DialogDescription>
        </DialogHeader>

        <NewMessage />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleOnClose}>
            Cancel
          </Button>

          <Button type="submit">Send message</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewMessagePage() {
  return (
    <div className="flex flex-1 animate-in flex-col duration-500 fade-in slide-in-from-bottom-2">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <div className="mb-4 space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight">
                New Message
              </h2>
              <p className="text-sm text-muted-foreground">
                Send a new message by entering the recipient, subject, and
                message details.
              </p>
            </div>
            <NewMessage />
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline">
                Cancel
              </Button>

              <Button type="submit">Send message</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
