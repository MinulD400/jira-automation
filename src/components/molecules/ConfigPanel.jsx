import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Settings, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'

const schema = z.object({
  jiraBaseUrl: z
    .url('Must be a valid URL (e.g. https://your-domain.atlassian.net)')
    .max(150),
  jiraEmail: z.email('Enter a valid email').max(100),
  jiraToken: z.string().min(1, 'API token is required').max(500),
  openaiKey: z.string().min(1, 'OpenAI API key is required').max(200),
})

function SecretField({ id, label, placeholder, maxLength, error, registration }) {
  const [show, setShow] = useState(false)
  return (

    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          maxLength={maxLength}
          {...registration}
          className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

SecretField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  maxLength: PropTypes.number,
  error: PropTypes.string,
  registration: PropTypes.object.isRequired,
}

export function ConfigPanel({ config, onSave }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: config,
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="w-5 h-5 text-slate-500" />
        <h2 className="text-base font-semibold text-slate-800">Credentials</h2>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 mb-5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-700 leading-relaxed">
          <span className="font-semibold">Your credentials are never saved.</span> They are held
          only in browser memory for this session and used solely to fetch data from Jira and
          OpenAI. Closing or refreshing the tab clears them entirely.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-4">
        <Input
          id="jiraBaseUrl"
          label="Jira Base URL"
          type="url"
          placeholder="https://your-domain.atlassian.net"
          maxLength={150}
          error={errors.jiraBaseUrl?.message}
          {...register('jiraBaseUrl')}
        />

        <Input
          id="jiraEmail"
          label="Jira Email"
          type="email"
          placeholder="you@company.com"
          maxLength={100}
          error={errors.jiraEmail?.message}
          {...register('jiraEmail')}
        />

        <SecretField
          id="jiraToken"
          label="Jira API Token"
          placeholder="Your Jira API token"
          maxLength={500}
          error={errors.jiraToken?.message}
          registration={register('jiraToken')}
        />

        <SecretField
          id="openaiKey"
          label="OpenAI API Key"
          placeholder="sk-..."
          maxLength={200}
          error={errors.openaiKey?.message}
          registration={register('openaiKey')}
        />

        <Button type="submit" variant="primary">
          Connect &amp; Start
        </Button>
      </form>
    </div>
  )
}

ConfigPanel.propTypes = {
  config: PropTypes.shape({
    jiraBaseUrl: PropTypes.string,
    jiraEmail: PropTypes.string,
    jiraToken: PropTypes.string,
    openaiKey: PropTypes.string,
  }).isRequired,
  onSave: PropTypes.func.isRequired,
}
