// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useFormValidation } from './useFormValidation'

let form
function mount(markup) {
  form = document.createElement('form')
  form.innerHTML = markup
  document.body.append(form)
  return renderHook(() => useFormValidation()).result
}
afterEach(() => { cleanup(); form?.remove() })

function validate(result, extra) {
  let valid
  act(() => { valid = result.current.validate(form, extra) })
  return valid
}

describe('form validation feedback', () => {
  it.each(['', '   ', '\t\n'])('rejects blank required text %j and focuses the first invalid field', value => {
    const result = mount('<input id="name" name="full_name" required><input id="email" type="email" required>')
    form.elements[0].value = value
    expect(validate(result)).toBe(false)
    expect(result.current.errors.full_name).toBeTruthy()
    expect(result.current.errors.email).toBeTruthy()
    expect(document.activeElement).toBe(form.elements[0])
  })

  it.each(['not-an-email', 'name@', '@example.com'])('rejects malformed email %s', value => {
    const result = mount('<input id="email" type="email" required>')
    form.elements[0].value = value
    expect(validate(result)).toBe(false)
    expect(result.current.errors.email).toMatch(/email/i)
  })

  it('enforces minimum length even for programmatically filled values', () => {
    const result = mount('<input name="password" type="password" required minlength="6">')
    form.elements[0].value = '12345'
    expect(validate(result)).toBe(false)
    expect(result.current.errors.password).toMatch(/6/)
    form.elements[0].value = '123456'
    expect(validate(result)).toBe(true)
    expect(result.current.errors).toEqual({})
  })

  it('does not trim passwords or require optional controls', () => {
    const result = mount('<input name="password" type="password" required minlength="6"><input name="campus"><textarea name="bio"></textarea>')
    form.elements[0].value = '      '
    expect(validate(result)).toBe(true)
    expect(form.elements[0].value).toBe('      ')
  })

  it.each(['', '1', '51', '2.5'])('rejects invalid capacity %j', value => {
    const result = mount('<input id="capacity" type="number" required min="2" max="50" step="1">')
    form.elements[0].value = value
    expect(validate(result)).toBe(false)
    expect(result.current.errors.capacity).toBeTruthy()
    expect(document.activeElement).toBe(form.elements[0])
  })

  it.each(['2', '50'])('accepts capacity boundary %s', value => {
    const result = mount('<input id="capacity" type="number" required min="2" max="50" step="1">')
    form.elements[0].value = value
    expect(validate(result)).toBe(true)
  })

  it('merges cross-field errors and focuses by DOM order rather than object order', () => {
    const result = mount('<input id="start"><input id="end">')
    expect(validate(result, { end: 'Selesai harus setelah mulai', start: 'Periksa mulai' })).toBe(false)
    expect(document.activeElement).toBe(form.elements[0])
    expect(result.current.errors.end).toMatch(/Selesai/)
  })

  it('clears only the edited error, and can reset all errors on mode transitions', () => {
    const result = mount('<input id="name" required><input id="email" required>')
    validate(result)
    act(() => result.current.clearError({ target: form.elements[0] }))
    expect(result.current.errors.name).toBeUndefined()
    expect(result.current.errors.email).toBeTruthy()
    act(() => result.current.clearErrors())
    expect(result.current.errors).toEqual({})
  })

  it('skips disabled fields and does not focus absent custom error controls', () => {
    const result = mount('<input id="ignored" required disabled><input id="visible">')
    expect(validate(result, { hidden: 'No longer in this mode' })).toBe(true)
    expect(result.current.errors).toEqual({})
  })
})
