class CreateCities < ActiveRecord::Migration[5.2]
  def change
    create_table :cities do |t|
      t.string :name
      t.decimal :lng
      t.decimal :lat
      t.references :trip, foreign_key: true


      t.timestamps
    end
  end
end
