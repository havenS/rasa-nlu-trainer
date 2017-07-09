// @flow

import React, { Component } from 'react';
import { Modal } from 'antd'
import { connect } from 'react-redux'
import * as actions from '../state/actions'

const mapState = (state) => ({
  visible: state.importModalOpen,
  pendingStrings: state.pendingStrings,
  stringsToImport: state.stringsToImport,
})

const mapActions = dispatch => ({
  close: () => {
    dispatch(actions.closeImportModal())
  },
  saveAndClose: () => {
    dispatch(actions.saveAndCloseImportModal())
  },
  fetchPendingStrings: () => {
    dispatch(actions.fetchPendingStrings())
  },
  addStringToImport: string => {
    dispatch(actions.addPendingString(string))
  }
})

class ImportModal extends Component {
  componentWillMount() {
    this.props.fetchPendingStrings()
  }

  renderStringsToImport() {
    const {
      pendingStrings,
      stringsToImport,
      addStringToImport,
    } = this.props
    if(Boolean(Object.keys(pendingStrings).length > 0)) {
      return (
        <div>
          {
            Object.keys(pendingStrings).map(key => {
              return (
                <a key={key} onClick={() => addStringToImport(key)} className="import-link">
                  • {pendingStrings[key]}
                  {stringsToImport.includes(key) && (
                    <img src="success.png" className="import-link-img"/>
                  )}
                </a>
              )
            })
          }
        </div>
      )
    } else {
      return (
        <div className="no-import">
          <span className="no-import-text">No strings to import</span>
        </div>
      )
    }
  }

  render() {
    const {
      close,
      saveAndClose,
      visible,
    } = this.props

    return (
      <Modal
        title='Add example'
        visible={Boolean(visible)}
        onOk={() => saveAndClose()}
        onCancel={() => close()}
        okText='add'
      >
        {this.renderStringsToImport()}
      </Modal>
    )
  }
}

export default connect(mapState, mapActions)(ImportModal)
